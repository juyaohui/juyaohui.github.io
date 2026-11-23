import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { loadConfig, type RelayConfig } from "../src/config";
import { SyncStore } from "../src/store";
import { buildServer } from "../src/server";
import type { PairResponse, SyncResponse } from "@blog/shared";

let root = "";
let config: RelayConfig;
let store: SyncStore;
let app: FastifyInstance;

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "relay-server-"));
  config = loadConfig({
    contentRoot: path.join(root, "src"),
    siteDist: path.join(root, "dist"),
    stateDir: path.join(root, ".relay"),
    repoRoot: root,
    port: 5199,
    git: { enabled: false },
  });
  fs.mkdirSync(config.contentRoot, { recursive: true });
  store = new SyncStore(config.stateDir, 10);
  ({ app } = await buildServer({ config, store }));
});

afterEach(async () => {
  await app.close();
  fs.rmSync(root, { recursive: true, force: true });
});

const note = (id = "n1") => ({
  id,
  title: `测试笔记 ${id}`,
  content: "你好，世界",
  tags: ["test"],
  target: "essay" as const,
  createdAt: "2026-11-23T10:00:00.000Z",
  updatedAt: "2026-11-23T10:00:00.000Z",
});

describe("relay API", () => {
  it("exposes health without auth", async () => {
    const response = await app.inject({ method: "GET", url: "/api/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true, protocol: 1 });
  });

  it("rejects a bad pairing code", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/pair",
      payload: { code: "000000", device: { name: "iPhone", platform: "ios" } },
    });
    expect(response.statusCode).toBe(401);
  });

  it("pairs a device and syncs a note", async () => {
    const { code } = store.pairing;
    const pair = await app.inject({
      method: "POST",
      url: "/api/pair",
      payload: { code, device: { name: "Pixel", platform: "android" } },
    });
    expect(pair.statusCode).toBe(200);
    const { token, device } = pair.json<PairResponse>();
    expect(token.length).toBeGreaterThan(20);

    const sync = await app.inject({
      method: "POST",
      url: "/api/sync",
      headers: { authorization: `Bearer ${token}` },
      payload: { deviceId: device.id, clientTime: new Date().toISOString(), items: [note()] },
    });
    expect(sync.statusCode).toBe(200);
    const body = sync.json<SyncResponse>();
    expect(body.ok).toBe(true);
    expect(body.files[0]?.status).toBe("created");
    const written = path.join(config.contentRoot, "posts", "随笔", body.files[0]!.path.split("/").pop()!);
    expect(fs.existsSync(written)).toBe(true);
    expect(fs.readFileSync(written, "utf8")).toContain("你好，世界");
  });

  it("requires a token for sync", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/sync",
      payload: { deviceId: "x", clientTime: "", items: [] },
    });
    expect(response.statusCode).toBe(401);
  });

  it("rejects oversized notes", async () => {
    const { code } = store.pairing;
    const pair = await app.inject({
      method: "POST",
      url: "/api/pair",
      payload: { code, device: { name: "Pixel", platform: "android" } },
    });
    const { token } = pair.json<PairResponse>();
    const sync = await app.inject({
      method: "POST",
      url: "/api/sync",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        deviceId: "x",
        clientTime: new Date().toISOString(),
        items: [{ ...note(), content: "x".repeat(300_000) }],
      },
    });
    expect(sync.statusCode).toBe(400);
  });

  it("returns pairing info via /api/info", async () => {
    const response = await app.inject({ method: "GET", url: "/api/info" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ name: config.name, protocol: 1, paired: false });
  });
});
