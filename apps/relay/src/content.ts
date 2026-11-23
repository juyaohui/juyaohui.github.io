import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SYNC_TARGETS, slugify, type SyncFileStatus, type SyncItem } from "@blog/shared";
import type { NoteRecord } from "./store";

export interface WriteOutcome {
  absPath: string;
  /** Path relative to the repository root, with forward slashes (for git). */
  relPath: string;
  status: SyncFileStatus;
  message?: string;
  record: NoteRecord;
}

const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

function today(item: SyncItem): string {
  const parsed = new Date(item.updatedAt);
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function yaml(value: string): string {
  return JSON.stringify(String(value));
}

/** Remove a frontmatter block accidentally sent by the client. */
function stripFrontmatter(content: string): string {
  return content
    .replace(/^\uFEFF/, "")
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\0/g, "")
    .trim();
}

export function renderNote(item: SyncItem): string {
  const date = today(item);
  const category =
    item.target === "essay" ? "随笔" : item.target === "tech" ? "技术栈" : "移动端";
  const tags = item.tags.filter(Boolean).slice(0, 12);
  const body = stripFrontmatter(item.content) || "（待补充）";
  const lines = [
    "---",
    `title: ${yaml(item.title || "手机笔记")}`,
    `date: ${date}`,
    `category: ${yaml(category)}`,
    `tags: ${JSON.stringify(tags)}`,
    `source: "mobile"`,
    `updated: ${yaml(item.updatedAt)}`,
    "---",
    "",
    body,
    "",
  ];
  return lines.join("\n");
}

function uniquePath(dir: string, base: string): string {
  let candidate = path.join(dir, `${base}.md`);
  let index = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base}-${index}.md`);
    index += 1;
    if (index > 50) throw new Error("无法生成唯一文件名");
  }
  return candidate;
}

export interface WriteNoteOptions {
  contentRoot: string;
  repoRoot: string;
  item: SyncItem;
  previous?: NoteRecord;
}

/**
 * Write one note into the content tree.
 *
 * Safety rules:
 *  - the target directory is fixed by the protocol (no client-provided paths)
 *  - the resolved path must stay inside contentRoot
 *  - if the file changed on the PC since the last sync, never overwrite it;
 *    keep both versions by writing a `.conflict-<ts>.md` file
 */
export function writeNote({ contentRoot, repoRoot, item, previous }: WriteNoteOptions): WriteOutcome {
  const target = SYNC_TARGETS[item.target];
  if (!target) throw new Error(`未知的同步目标: ${item.target}`);

  const dir = path.resolve(contentRoot, target.dir);
  const root = path.resolve(contentRoot);
  if (!dir.startsWith(root + path.sep)) throw new Error("目标目录越界");

  const markdown = renderNote(item);
  const nextHash = hash(markdown);
  const rel = (abs: string) => path.relative(repoRoot, abs).split(path.sep).join("/");

  const date = today(item);
  const base = `${date}-${slugify(item.title || "手机笔记")}`;
  const candidate = previous ? path.resolve(previous.path) : "";
  const inside = (p: string) => p.startsWith(root + path.sep);

  // Existing note: update only when the PC copy is unchanged since last sync.
  if (previous && inside(candidate)) {
    if (previous.hash === nextHash && fs.existsSync(candidate)) {
      return {
        absPath: candidate,
        relPath: rel(candidate),
        status: "unchanged",
        record: previous,
      };
    }
    const current = fs.existsSync(candidate) ? fs.readFileSync(candidate, "utf8") : "";
    const currentHash = current ? hash(current) : "";
    if (current && currentHash !== previous.hash) {
      const conflict = path.join(
        path.dirname(candidate),
        `${path.basename(candidate, ".md")}.conflict-${Date.now()}.md`,
      );
      fs.mkdirSync(path.dirname(conflict), { recursive: true });
      fs.writeFileSync(conflict, markdown, "utf8");
      return {
        absPath: conflict,
        relPath: rel(conflict),
        status: "conflict",
        message: "电脑上的原文已被修改，已保留两个版本（冲突副本）",
        record: { path: conflict, hash: nextHash, updatedAt: new Date().toISOString() },
      };
    }
    if (current && currentHash === nextHash) {
      return {
        absPath: candidate,
        relPath: rel(candidate),
        status: "unchanged",
        record: { path: candidate, hash: nextHash, updatedAt: new Date().toISOString() },
      };
    }
    fs.mkdirSync(path.dirname(candidate), { recursive: true });
    fs.writeFileSync(candidate, markdown, "utf8");
    return {
      absPath: candidate,
      relPath: rel(candidate),
      status: "updated",
      record: { path: candidate, hash: nextHash, updatedAt: new Date().toISOString() },
    };
  }

  // New note: if a same-named file already exists, keep both.
  const exact = path.join(dir, `${base}.md`);
  if (fs.existsSync(exact)) {
    const existing = fs.readFileSync(exact, "utf8");
    if (hash(existing) === nextHash) {
      return {
        absPath: exact,
        relPath: rel(exact),
        status: "unchanged",
        record: { path: exact, hash: nextHash, updatedAt: new Date().toISOString() },
      };
    }
    const abs = uniquePath(dir, base);
    fs.writeFileSync(abs, markdown, "utf8");
    return {
      absPath: abs,
      relPath: rel(abs),
      status: "created",
      message: "同名文件已存在，已自动改名",
      record: { path: abs, hash: nextHash, updatedAt: new Date().toISOString() },
    };
  }

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(exact, markdown, "utf8");
  return {
    absPath: exact,
    relPath: rel(exact),
    status: "created",
    record: { path: exact, hash: nextHash, updatedAt: new Date().toISOString() },
  };
}
