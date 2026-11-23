import fs from "node:fs";
import path from "node:path";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import QRCode from "qrcode";
import { z } from "zod";
import {
  API,
  LIMITS,
  PROTOCOL_VERSION,
  type PairResponse,
  type ServerInfo,
  type SyncProgressEvent,
  type SyncResponse,
} from "@blog/shared";
import { isPrivateAddress, lanAddresses, readGitToken, type RelayConfig } from "./config";
import { SyncStore } from "./store";
import { writeNote } from "./content";
import { commitAndPush } from "./git";

export const RELAY_VERSION = "2.0.0";

const PairBody = z.object({
  code: z.string().min(4).max(8),
  device: z.object({
    name: z.string().trim().min(1).max(40),
    platform: z.string().trim().max(40),
  }),
});

const SyncItemSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().max(LIMITS.maxTitleChars),
  content: z.string().max(LIMITS.maxItemBytes),
  tags: z.array(z.string().max(24)).max(12),
  target: z.enum(["essay", "tech", "note"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const SyncBody = z.object({
  deviceId: z.string().max(80),
  clientTime: z.string().max(40),
  items: z.array(SyncItemSchema).max(LIMITS.maxItems),
});

export interface BuildServerOptions {
  config: RelayConfig;
  store?: SyncStore;
}

interface PairAttempt {
  count: number;
  resetAt: number;
}

export interface RelayServer {
  app: FastifyInstance;
  store: SyncStore;
}

export async function buildServer({ config, store }: BuildServerOptions): Promise<RelayServer> {
  const app = Fastify({ logger: false, bodyLimit: 8 * 1024 * 1024, trustProxy: false });
  const syncStore = store ?? new SyncStore(config.stateDir, config.pairingTtlMinutes);
  const subscribers = new Set<(event: SyncProgressEvent) => void>();
  const pairAttempts = new Map<string, PairAttempt>();
  let syncing = false;
  let lastEvent: SyncProgressEvent | undefined;

  const lanUrls = () => lanAddresses().map((ip) => `http://${ip}:${config.port}`);

  const serverInfo = (): ServerInfo => {
    const commit = syncStore.lastCommit;
    return {
      name: config.name,
      version: RELAY_VERSION,
      protocol: PROTOCOL_VERSION,
      siteUrl: config.siteUrl,
      lanUrls: lanUrls(),
      paired: syncStore.deviceCount > 0,
      lastSyncAt: syncStore.lastSyncAt,
      lastCommit: commit
        ? { sha: commit.sha, message: commit.message, pushed: commit.pushed, at: commit.at }
        : undefined,
    };
  };

  const broadcast = (phase: SyncProgressEvent["phase"], message: string) => {
    const event: SyncProgressEvent = { phase, message, at: new Date().toISOString() };
    lastEvent = event;
    for (const send of subscribers) send(event);
  };

  const tokenFrom = (request: FastifyRequest): string | undefined => {
    const header = request.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();
    const query = request.query as { token?: string } | undefined;
    return query?.token;
  };

  const deviceFrom = (request: FastifyRequest) => syncStore.auth(tokenFrom(request));

  app.addHook("onRequest", async (request, reply) => {
    const ip = request.socket.remoteAddress;
    if (!config.allowWan && !isPrivateAddress(ip)) {
      return reply.code(403).send({ error: "仅允许局域网访问" });
    }
    if (request.url.startsWith("/api/") && request.method === "POST") {
      // cheap CSRF / abuse guard: only accept JSON from browsers
      const contentType = request.headers["content-type"] ?? "";
      if (!contentType.includes("application/json")) {
        return reply.code(415).send({ error: "需要 application/json" });
      }
    }
    return undefined;
  });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  });

  app.get(API.health, async () => ({
    ok: true,
    name: config.name,
    version: RELAY_VERSION,
    protocol: PROTOCOL_VERSION,
    time: new Date().toISOString(),
  }));

  app.get(API.info, async () => serverInfo());

  app.post(API.pair, async (request, reply) => {
    const ip = request.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const attempt = pairAttempts.get(ip);
    if (attempt && attempt.resetAt > now && attempt.count >= 10) {
      return reply.code(429).send({ error: "尝试次数过多，请十分钟后再试" });
    }
    pairAttempts.set(ip, {
      count: attempt && attempt.resetAt > now ? attempt.count + 1 : 1,
      resetAt: attempt && attempt.resetAt > now ? attempt.resetAt : now + 10 * 60_000,
    });

    const parsed = PairBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "配对信息不完整" });
    }
    if (!syncStore.verifyPairCode(parsed.data.code)) {
      return reply.code(401).send({ error: "配对码错误或已过期" });
    }
    const { device, token } = syncStore.createDevice(
      parsed.data.device.name,
      parsed.data.device.platform,
    );
    const response: PairResponse = { token, device, server: serverInfo() };
    return response;
  });

  app.get(API.events, async (request, reply: FastifyReply) => {
    const device = deviceFrom(request);
    if (!device) return reply.code(401).send({ error: "未配对" });
    syncStore.touchDevice(device.id);

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    const send = (event: SyncProgressEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    send(
      lastEvent ?? {
        phase: "queued",
        message: "已连接，等待同步",
        at: new Date().toISOString(),
      },
    );
    subscribers.add(send);
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    request.raw.on("close", () => {
      clearInterval(heartbeat);
      subscribers.delete(send);
    });
    return reply;
  });

  app.post(API.sync, async (request, reply) => {
    const device = deviceFrom(request);
    if (!device) return reply.code(401).send({ error: "未配对或令牌已失效" });
    syncStore.touchDevice(device.id);

    if (syncing) {
      return reply.code(409).send({ error: "上一次同步还在进行中" });
    }
    const parsed = SyncBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "同步数据格式不正确", details: parsed.error.issues });
    }
    const { items } = parsed.data;
    const total = items.reduce((sum, item) => sum + Buffer.byteLength(item.content, "utf8"), 0);
    if (total > LIMITS.maxTotalBytes) {
      return reply.code(413).send({ error: "内容过大" });
    }

    syncing = true;
    const started = Date.now();
    try {
      broadcast("received", `收到 ${items.length} 条笔记`);
      const results: SyncResponse["files"] = [];
      const files: string[] = [];

      for (const [index, item] of items.entries()) {
        broadcast("writing", `正在写入 ${index + 1}/${items.length}：${item.title || "无标题"}`);
        try {
          const outcome = writeNote({
            contentRoot: config.contentRoot,
            repoRoot: config.repoRoot,
            item,
            previous: syncStore.noteFor(item.id),
          });
          syncStore.rememberNote(item.id, outcome.record);
          results.push({
            path: outcome.relPath,
            title: item.title,
            status: outcome.status,
            message: outcome.message,
          });
          if (outcome.status === "created" || outcome.status === "updated" || outcome.status === "conflict") {
            files.push(outcome.relPath);
          }
        } catch (error) {
          results.push({
            path: "",
            title: item.title,
            status: "rejected",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      let commit: SyncResponse["commit"];
      if (files.length) {
        broadcast("committing", "正在提交到 git…");
        const message = `sync: 手机同步 ${files.length} 条笔记（${device.name}）`;
        const outcome = await commitAndPush(files, message, {
          repoRoot: config.repoRoot,
          git: config.git,
          token: readGitToken(config.tokenFile),
        });
        if (outcome.sha) {
          commit = {
            sha: outcome.sha,
            message: outcome.message,
            pushed: outcome.pushed,
          };
          syncStore.recordSync({
            sha: outcome.sha,
            message: outcome.message,
            pushed: outcome.pushed,
            at: new Date().toISOString(),
          });
        }
        broadcast(
          "pushing",
          outcome.pushed ? "已推送到 GitHub，Pages 正在构建" : outcome.message,
        );
      } else {
        broadcast("committing", items.length ? "没有需要提交的改动" : "没有待同步的笔记");
      }

      broadcast("done", `同步完成，用时 ${((Date.now() - started) / 1000).toFixed(1)}s`);
      return {
        ok: true,
        received: items.length,
        files: results,
        commit,
        serverTime: new Date().toISOString(),
      } satisfies SyncResponse;
    } catch (error) {
      broadcast("error", error instanceof Error ? error.message : "同步失败");
      app.log.error(error);
      return reply.code(500).send({ error: "同步失败，请查看电脑端日志" });
    } finally {
      syncing = false;
    }
  });

  app.post(API.revoke, async (request, reply) => {
    const token = tokenFrom(request);
    const device = syncStore.auth(token);
    if (!device) return reply.code(401).send({ error: "未配对" });
    syncStore.revokeDevice(device.id);
    return { ok: true };
  });

  // `/pair` shows the QR code on the PC screen.
  app.get("/pair", async (_request, reply) => {
    const { code, expiresAt } = syncStore.pairing;
    const first = lanUrls()[0] ?? `http://127.0.0.1:${config.port}`;
    const mobileUrl = `${first}/sync/?code=${code}`;
    const qr = await QRCode.toDataURL(mobileUrl, { margin: 1, width: 320 });
    reply.type("text/html; charset=utf-8");
    return pairPage({ mobileUrl, code, expiresAt, qr, name: config.name });
  });

  const distExists = fs.existsSync(path.join(config.siteDist, "index.html"));
  if (distExists) {
    await app.register(fastifyStatic, {
      root: config.siteDist,
      prefix: "/",
      index: ["index.html"],
      extensions: ["html"],
      wildcard: true,
      cacheControl: false,
      maxAge: 0,
    });
  }

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "接口不存在" });
    }
    const notFound = path.join(config.siteDist, "404.html");
    if (fs.existsSync(notFound)) {
      reply.type("text/html; charset=utf-8").code(404);
      return fs.createReadStream(notFound);
    }
    reply.type("text/html; charset=utf-8").code(distExists ? 404 : 503);
    return fallbackPage(Boolean(distExists));
  });

  app.setErrorHandler((error: { statusCode?: number; message: string }, _request, reply) => {
    const status = error.statusCode ?? 500;
    reply.code(status).send({ error: status >= 500 ? "服务器内部错误" : error.message });
  });

  return { app, store: syncStore };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pairPage({
  mobileUrl,
  code,
  expiresAt,
  qr,
  name,
}: {
  mobileUrl: string;
  code: string;
  expiresAt: number;
  qr: string;
  name: string;
}): string {
  const minutes = Math.max(0, Math.round((expiresAt - Date.now()) / 60000));
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(name)} · 手机同步</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080b12;color:#e7ecf5;
       font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif}
  .card{width:min(92vw,720px);padding:36px;border-radius:24px;background:linear-gradient(160deg,rgba(125,211,252,.12),rgba(167,139,250,.08));
        border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 80px rgba(0,0,0,.5);text-align:center}
  h1{margin:0 0 6px;font-size:22px;font-weight:650;letter-spacing:.02em}
  p{margin:0;color:#9aa7bd;font-size:14px}
  .qr{margin:26px auto;width:260px;height:260px;padding:14px;border-radius:18px;background:#fff}
  .qr img{width:100%;height:100%;display:block}
  .code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:34px;letter-spacing:.32em;
        color:#7dd3fc;margin:8px 0 4px}
  .url{margin-top:18px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;
       color:#c7d2fe;word-break:break-all}
  .hint{margin-top:18px;font-size:12px;color:#64748b}
  a{color:#7dd3fc}
</style></head>
<body><main class="card">
  <h1>${escapeHtml(name)} · 手机一键同步</h1>
  <p>用手机相机扫码，或手动打开下面的地址</p>
  <div class="qr"><img alt="pairing QR" src="${qr}"></div>
  <div class="code">${code}</div>
  <p>配对码 ${minutes} 分钟内有效</p>
  <div class="url">${escapeHtml(mobileUrl)}</div>
  <p class="hint">手机与电脑需要连接同一个 Wi-Fi / 局域网。把页面「添加到主屏幕」即可当作 App 使用。</p>
  <p class="hint"><a href="/">打开博客首页</a></p>
</main></body></html>`;
}

function fallbackPage(distExists: boolean): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>同步服务</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080b12;color:#e7ecf5;
font-family:ui-sans-serif,system-ui,"PingFang SC","Microsoft YaHei",sans-serif}
main{max-width:560px;padding:32px;border:1px solid #1e293b;border-radius:20px;background:#0d1320;line-height:1.7}
code{color:#7dd3fc}a{color:#7dd3fc}</style></head>
<body><main><h1>同步服务已启动</h1>
<p>${distExists ? "页面不存在。" : "前端还没有构建，手机端页面暂时不可用。"}</p>
<p>在电脑上运行 <code>pnpm build</code> 之后再访问 <code>/sync</code>。</p>
<p><a href="/pair">查看配对二维码</a></p></main></body></html>`;
}
