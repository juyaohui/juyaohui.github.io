import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** apps/relay */
export const RELAY_ROOT = path.resolve(HERE, "..");
/** repository root (jade-homepage) */
export const REPO_ROOT = path.resolve(RELAY_ROOT, "..", "..");

export interface GitConfig {
  enabled: boolean;
  remote: string;
  branch: string;
  push: boolean;
  authorName: string;
  authorEmail: string;
}

export interface RelayConfig {
  name: string;
  port: number;
  host: string;
  /** Public site, shown in the phone app. */
  siteUrl?: string;
  /** Markdown source tree (apps/web/src). */
  contentRoot: string;
  /** Built site, served to the phone over LAN (apps/web/.vitepress/dist). */
  siteDist: string;
  repoRoot: string;
  /** Optional GitHub token used for `git push`. */
  tokenFile: string;
  stateDir: string;
  git: GitConfig;
  pairingTtlMinutes: number;
  allowWan: boolean;
}

type PartialConfig = Partial<Omit<RelayConfig, "git">> & { git?: Partial<GitConfig> };

const defaults = (): RelayConfig => ({
  name: os.hostname(),
  port: Number(process.env.RELAY_PORT ?? 5178),
  host: process.env.RELAY_HOST ?? "0.0.0.0",
  siteUrl: undefined,
  contentRoot: path.join(REPO_ROOT, "apps", "web", "src"),
  siteDist: path.join(REPO_ROOT, "apps", "web", ".vitepress", "dist"),
  repoRoot: REPO_ROOT,
  tokenFile: path.join(REPO_ROOT, ".secrets", "github.token"),
  stateDir: path.join(RELAY_ROOT, ".relay"),
  git: {
    enabled: true,
    remote: "origin",
    branch: "master",
    push: true,
    authorName: "mobile-sync",
    authorEmail: "mobile-sync@localhost",
  },
  pairingTtlMinutes: 10,
  allowWan: false,
});

function readJson(file: string): PartialConfig {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as PartialConfig;
  } catch {
    return {};
  }
}

export function loadConfig(overrides: PartialConfig = {}): RelayConfig {
  const base = defaults();
  const file = readJson(path.join(RELAY_ROOT, "relay.config.json"));
  const merged: RelayConfig = {
    ...base,
    ...stripUndefined(file),
    ...stripUndefined(overrides),
    git: {
      ...base.git,
      ...stripUndefined(file.git ?? {}),
      ...stripUndefined(overrides.git ?? {}),
    },
  };

  // Environment switches are handy for one-off runs and CI.
  if (process.env.RELAY_PUSH === "0") merged.git.push = false;
  if (process.env.RELAY_GIT === "0") merged.git.enabled = false;
  if (process.env.RELAY_SITE_URL) merged.siteUrl = process.env.RELAY_SITE_URL;

  return merged;
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as T;
}

export function readGitToken(tokenFile: string): string | undefined {
  try {
    const token = fs.readFileSync(tokenFile, "utf8").trim();
    return token || undefined;
  } catch {
    return undefined;
  }
}

/** All IPv4 addresses a phone on the same LAN can use. */
export function lanAddresses(): string[] {
  const out = new Set<string>();
  for (const [name, infos] of Object.entries(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family !== "IPv4" || info.internal) continue;
      if (info.address.startsWith("169.254.")) continue;
      out.add(info.address);
      void name;
    }
  }
  return [...out];
}

export function isPrivateAddress(address: string | undefined): boolean {
  if (!address) return false;
  const ip = address.replace(/^::ffff:/, "");
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return false;
}
