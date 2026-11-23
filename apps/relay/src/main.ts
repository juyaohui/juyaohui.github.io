import fs from "node:fs";
import path from "node:path";
import qrcodeTerminal from "qrcode-terminal";
import { lanAddresses, loadConfig, readGitToken } from "./config";
import { SyncStore } from "./store";
import { buildServer } from "./server";

const config = loadConfig();

function fail(message: string): never {
  console.error(`\n[relay] ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(path.join(config.contentRoot))) {
  fail(`内容目录不存在：${config.contentRoot}`);
}

const store = new SyncStore(config.stateDir, config.pairingTtlMinutes);
const { app } = await buildServer({ config, store });

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("EADDRINUSE")) {
    fail(`端口 ${config.port} 已被占用，请先关闭旧进程或修改 relay.config.json 的 port。`);
  }
  fail(message);
}

const addresses = lanAddresses();
const port = config.port;
const urls = addresses.map((ip) => `http://${ip}:${port}`);
const primary = urls[0] ?? `http://127.0.0.1:${port}`;
const { code, expiresAt } = store.pairing;
const mobileUrl = `${primary}/sync/?code=${code}`;
const token = readGitToken(config.tokenFile);
const dist = fs.existsSync(path.join(config.siteDist, "index.html"));

const line = "─".repeat(52);
console.log("");
console.log(`  ${config.name} · 手机同步服务`);
console.log(`  ${line}`);
console.log(`  手机访问    ${mobileUrl}`);
if (urls.length > 1) {
  for (const url of urls.slice(1)) console.log(`              ${url}/sync/`);
}
console.log(`  配对码      ${code}   （${Math.round((expiresAt - Date.now()) / 60000)} 分钟内有效）`);
console.log(`  配对页面    ${primary}/pair`);
if (config.siteUrl) console.log(`  公开主页    ${config.siteUrl}`);
console.log(`  前端页面    ${dist ? "已构建" : "未构建 · 先在电脑上运行 pnpm build"}`);
console.log(
  `  自动推送    ${config.git.enabled ? (config.git.push ? `GitHub ${config.git.remote}/${config.git.branch}` : "仅本地提交") : "已关闭"}${
    token ? " · token 已加载" : config.git.push ? " · 未找到 token（将尝试系统凭据）" : ""
  }`,
);
console.log(`  ${line}`);
console.log("  手机与电脑需连接同一 Wi-Fi，扫码即可打开手机端。");
console.log("");

qrcodeTerminal.generate(mobileUrl, { small: true }, (qr) => {
  console.log(qr);
});

const shutdown = async (signal: string) => {
  console.log(`\n[relay] 收到 ${signal}，正在关闭…`);
  await app.close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
