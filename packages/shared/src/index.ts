/**
 * Wire protocol shared by apps/web (mobile sync UI) and apps/relay (PC server).
 * Keep this file dependency-free: it is imported by the browser, by Vite and by tsx.
 */

export const PROTOCOL_VERSION = 1;

export const API = {
  health: "/api/health",
  info: "/api/info",
  pair: "/api/pair",
  sync: "/api/sync",
  events: "/api/events",
  revoke: "/api/devices/revoke",
} as const;

/** Where a mobile note should land in the content tree. */
export const SYNC_TARGETS = {
  essay: { label: "随笔", dir: "posts/随笔", icon: "pen" },
  tech: { label: "技术", dir: "posts/技术栈", icon: "chip" },
  note: { label: "笔记", dir: "notes/移动端", icon: "book" },
} as const;

export type SyncTarget = keyof typeof SYNC_TARGETS;

export interface SyncItem {
  /** Stable client-side id (uuid). Also used for conflict naming. */
  id: string;
  title: string;
  /** Markdown body, no frontmatter. */
  content: string;
  tags: string[];
  target: SyncTarget;
  createdAt: string;
  updatedAt: string;
  /** Optional images referenced from the Markdown as /images/mobile/<name>. */
  images?: SyncImage[];
}

export interface SyncImage {
  /** File name only, e.g. 20261124-231500-a1b2.jpg */
  name: string;
  /** Base64 without the data: prefix. */
  data: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  addedAt: string;
  lastSeenAt: string;
}

export interface ServerInfo {
  name: string;
  version: string;
  protocol: number;
  /** Public site, if configured. */
  siteUrl?: string;
  /** Every address the phone can use on the LAN. */
  lanUrls: string[];
  paired: boolean;
  lastSyncAt?: string;
  lastCommit?: {
    sha: string;
    message: string;
    pushed: boolean;
    at: string;
  };
}

export interface PairRequest {
  code: string;
  device: {
    name: string;
    platform: string;
  };
}

export interface PairResponse {
  token: string;
  device: DeviceInfo;
  server: ServerInfo;
}

export interface SyncRequest {
  deviceId: string;
  items: SyncItem[];
  clientTime: string;
}

export type SyncFileStatus =
  | "created"
  | "updated"
  | "unchanged"
  | "conflict"
  | "rejected";

export interface SyncFileResult {
  path: string;
  title: string;
  status: SyncFileStatus;
  message?: string;
}

export interface SyncResponse {
  ok: boolean;
  received: number;
  files: SyncFileResult[];
  commit?: {
    sha: string;
    message: string;
    pushed: boolean;
  };
  serverTime: string;
  error?: string;
}

export type SyncPhase =
  | "queued"
  | "received"
  | "writing"
  | "committing"
  | "pushing"
  | "done"
  | "error";

export interface SyncProgressEvent {
  phase: SyncPhase;
  message: string;
  at: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

/** Hard limits, enforced by the relay. */
export const LIMITS = {
  maxItems: 100,
  maxItemBytes: 200_000,
  maxTotalBytes: 4_000_000,
  maxTitleChars: 120,
  maxImagesPerItem: 8,
  /** Decoded bytes per image. */
  maxImageBytes: 3_000_000,
  /** Decoded bytes for all images in one sync request. */
  maxTotalImageBytes: 20_000_000,
  /** Whole JSON request body. */
  maxTotalRequestBytes: 32_000_000,
} as const;

export function isSyncTarget(value: unknown): value is SyncTarget {
  return typeof value === "string" && value in SYNC_TARGETS;
}

/** Turn a note title into a filesystem-safe slug (keeps CJK). */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return base || "note";
}
