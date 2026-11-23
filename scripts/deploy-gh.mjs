#!/usr/bin/env node
/**
 * Publish this repository to GitHub and turn on GitHub Pages (Actions build).
 *
 *   pnpm deploy -- --token-file .secrets/github.token --repo juyaohui/juyaohui.github.io
 *
 * The token is read from (first match):
 *   --token-file <path>  |  GITHUB_TOKEN env  |  .secrets/github.token
 *
 * The script is idempotent: it creates the repo if missing, force-pushes the
 * current branch (the old site is replaced), configures Pages to build with
 * Actions, and waits for the deployment run.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const tokenFile = readArg("token-file", path.join(".secrets", "github.token"));
const repoArg = readArg("repo", "juyaohui/juyaohui.github.io");
const branch = readArg("branch", "master");
const skipWait = args.includes("--no-wait");

function readToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  if (fs.existsSync(tokenFile)) return fs.readFileSync(tokenFile, "utf8").trim();
  return "";
}

const token = readToken();
if (!token) {
  console.error(`
没有找到 GitHub token。请任选一种方式提供：

  1. 把 token 写进 ${path.resolve(tokenFile)}（一行，不要加引号）
  2. 设置环境变量 GITHUB_TOKEN
  3. 运行：pnpm deploy -- --token-file <你的文件路径>

Token 需要 repo（以及 workflow、Pages）权限。
`);
  process.exit(1);
}

const [owner, name] = repoArg.split("/");
if (!owner || !name) {
  console.error(`仓库格式应为 owner/repo，收到：${repoArg}`);
  process.exit(1);
}

const isUserSite = name.toLowerCase().endsWith(".github.io");
const base = isUserSite ? "/" : `/${name}/`;
const origin = `https://${owner}.github.io`;
const liveUrl = isUserSite ? `${origin}/` : `${origin}${base}`;
const api = "https://api.github.com";

async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${api}${endpoint}`, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

function git(gitArgs, options = {}) {
  return execFileSync("git", gitArgs, {
    stdio: options.quiet ? "pipe" : "inherit",
    encoding: "utf8",
    ...options,
  });
}

function run(command, commandArgs, env = {}) {
  execFileSync(command, commandArgs, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
  });
}

console.log(`\n[deploy] 目标仓库：${owner}/${name}`);
console.log(`[deploy] base 路径：${base}`);

// 1. Verify token and repo existence.
const me = await apiFetch("/user");
if (me.status !== 200) {
  console.error(`[deploy] token 无效或没有访问权限（HTTP ${me.status}）`);
  process.exit(1);
}
console.log(`[deploy] 已登录：${me.body.login}`);

let repo = await apiFetch(`/repos/${owner}/${name}`);
if (repo.status === 404) {
  console.log("[deploy] 仓库不存在，正在创建…");
  const create = await apiFetch(owner === me.body.login ? "/user/repos" : `/orgs/${owner}/repos`, {
    method: "POST",
    body: JSON.stringify({
      name,
      private: false,
      description: "Jade 的个人主页 · VitePress + TypeScript",
      auto_init: false,
    }),
  });
  if (create.status !== 201) {
    console.error("[deploy] 创建仓库失败：", create.body);
    process.exit(1);
  }
  console.log("[deploy] 仓库已创建");
}

// 2. Enable Pages with the Actions build type before pushing, so the run can deploy.
async function enablePages() {
  const pages = await apiFetch(`/repos/${owner}/${name}/pages`);
  if (pages.status === 200) {
    if (pages.body.build_type === "workflow") {
      console.log("[deploy] Pages 已使用 GitHub Actions 构建");
      return true;
    }
    const update = await apiFetch(`/repos/${owner}/${name}/pages`, {
      method: "PUT",
      body: JSON.stringify({ build_type: "workflow" }),
    });
    console.log(`[deploy] 切换 Pages 构建方式：HTTP ${update.status}`);
    return update.status >= 200 && update.status < 300;
  }
  const create = await apiFetch(`/repos/${owner}/${name}/pages`, {
    method: "POST",
    body: JSON.stringify({ build_type: "workflow" }),
  });
  if (create.status === 201 || create.status === 204) {
    console.log("[deploy] 已启用 GitHub Pages（Actions）");
    return true;
  }
  console.warn("[deploy] 自动启用 Pages 失败：", create.body);
  return false;
}

const pagesReady = await enablePages();

// 3. Build with the right base path.
console.log(`\n[deploy] 构建站点（BASE_PATH=${base}）…`);
run("pnpm", ["--filter", "@blog/web", "build"], {
  BASE_PATH: base,
  SITE_ORIGIN: origin,
});

// 4. Commit and push.
if (!fs.existsSync(".git")) {
  console.log("[deploy] 初始化 git 仓库");
  git(["init", "-b", branch]);
}

const gitUser = me.body.login;
const identity = [
  "-c",
  `user.name=${me.body.name || gitUser}`,
  "-c",
  `user.email=${me.body.email || `${gitUser}@users.noreply.github.com`}`,
];

git(["add", "-A"]);
const status = git(["status", "--porcelain"], { quiet: true }).trim();
if (status) {
  git([...identity, "commit", "-m", `deploy: ${new Date().toISOString()}`]);
} else {
  console.log("[deploy] 没有新的改动需要提交");
}

const remoteUrl = `https://github.com/${owner}/${name}.git`;
const remotes = git(["remote"], { quiet: true });
if (remotes.split(/\r?\n/).includes("origin")) {
  git(["remote", "set-url", "origin", remoteUrl]);
} else {
  git(["remote", "add", "origin", remoteUrl]);
}

const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
console.log(`[deploy] 推送 ${branch} → ${remoteUrl}`);
git([
  "-c",
  `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basic}`,
  "push",
  "--force",
  "origin",
  `HEAD:${branch}`,
]);

// 5. Wait for the Actions deployment.
if (!pagesReady) {
  console.log("[deploy] 再次尝试启用 Pages…");
  await enablePages();
}

if (skipWait) {
  console.log(`[deploy] 已推送。查看 Actions：https://github.com/${owner}/${name}/actions`);
  console.log(`[deploy] 预计地址：${liveUrl}`);
  process.exit(0);
}

const headSha = git(["rev-parse", "HEAD"], { quiet: true }).trim();
console.log("[deploy] 等待 GitHub Actions 构建…");
let runId;
for (let attempt = 0; attempt < 30; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 6000));
  const runs = await apiFetch(
    `/repos/${owner}/${name}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=10`,
  );
  const candidate = (runs.body?.workflow_runs ?? []).find((item) => item.head_sha === headSha);
  if (candidate) {
    runId = candidate.id;
    if (candidate.status === "completed") {
      console.log(`[deploy] 构建结束：${candidate.conclusion}`);
      console.log(`[deploy] 运行详情：${candidate.html_url}`);
      break;
    }
  }
}

if (runId) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const runInfo = await apiFetch(`/repos/${owner}/${name}/actions/runs/${runId}`);
    if (runInfo.body?.status === "completed") {
      console.log(`[deploy] 部署结果：${runInfo.body.conclusion}`);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

console.log(`
[deploy] 完成
  仓库：https://github.com/${owner}/${name}
  地址：${liveUrl}
  如果刚启用 Pages，首次生效可能需要 1–2 分钟。
`);
