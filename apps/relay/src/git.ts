import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitConfig } from "./config";

const run = promisify(execFile);

export interface GitOutcome {
  committed: boolean;
  sha?: string;
  pushed: boolean;
  message: string;
  detail?: string;
}

interface GitRunOptions {
  repoRoot: string;
  git: GitConfig;
  token?: string;
}

function authArgs(token: string | undefined): string[] {
  if (!token) return [];
  const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
  return ["-c", `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basic}`];
}

async function git(args: string[], options: GitRunOptions): Promise<string> {
  const { stdout } = await run("git", args, {
    cwd: options.repoRoot,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_ASKPASS: "echo",
    },
    timeout: 180_000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout.trim();
}

/**
 * Stage the given files (relative to the repo root), commit them and push.
 * A push failure is reported, never thrown: the notes are already safe on disk.
 */
export async function commitAndPush(
  files: string[],
  message: string,
  options: GitRunOptions,
): Promise<GitOutcome> {
  const { git: config } = options;
  if (!config.enabled) {
    return { committed: false, pushed: false, message: "git 同步已关闭", detail: "RELAY_GIT=0" };
  }

  try {
    await git(["rev-parse", "--is-inside-work-tree"], options);
  } catch {
    return {
      committed: false,
      pushed: false,
      message: "当前目录不是 git 仓库",
      detail: options.repoRoot,
    };
  }

  if (files.length) {
    await git(["add", "--", ...files], options);
  }
  const staged = await git(["diff", "--cached", "--name-only"], options);
  if (!staged) {
    const sha = await git(["rev-parse", "--short", "HEAD"], options).catch(() => undefined);
    return { committed: false, sha, pushed: false, message: "没有需要提交的改动" };
  }

  await git(
    [
      "-c",
      `user.name=${config.authorName}`,
      "-c",
      `user.email=${config.authorEmail}`,
      "commit",
      "-m",
      message,
    ],
    options,
  );
  const sha = await git(["rev-parse", "--short", "HEAD"], options);

  if (!config.push) {
    return { committed: true, sha, pushed: false, message: "已提交到本地，未推送" };
  }

  try {
    await git(
      [...authArgs(options.token), "push", config.remote, `HEAD:${config.branch}`],
      options,
    );
    return { committed: true, sha, pushed: true, message: "已提交并推送到 GitHub" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      committed: true,
      sha,
      pushed: false,
      message: "已提交到本地，但推送失败",
      detail: detail.slice(0, 600),
    };
  }
}
