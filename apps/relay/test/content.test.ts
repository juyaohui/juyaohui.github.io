import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderNote, writeImages, writeNote } from "../src/content";
import type { SyncItem } from "@blog/shared";

const item = (overrides: Partial<SyncItem> = {}): SyncItem => ({
  id: "item-1",
  title: "雨天的测试笔记",
  content: "## 小标题\n\n这是正文。",
  tags: ["test", "mobile"],
  target: "essay",
  createdAt: "2026-11-23T10:00:00.000Z",
  updatedAt: "2026-11-23T10:00:00.000Z",
  ...overrides,
});

let root = "";
let contentRoot = "";

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "relay-content-"));
  contentRoot = path.join(root, "apps", "web", "src");
  fs.mkdirSync(contentRoot, { recursive: true });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("renderNote", () => {
  it("builds valid frontmatter and keeps the body", () => {
    const markdown = renderNote(item());
    expect(markdown.startsWith("---\n")).toBe(true);
    expect(markdown).toContain('title: "雨天的测试笔记"');
    expect(markdown).toContain("category: \"随笔\"");
    expect(markdown).toContain('tags: ["test","mobile"]');
    expect(markdown).toContain("这是正文。");
  });

  it("strips a frontmatter block sent by the client", () => {
    const markdown = renderNote(item({ content: "---\ntitle: x\n---\n\n正文" }));
    expect(markdown.match(/^---$/gm)?.length).toBe(2);
    expect(markdown).toContain("正文");
  });
});

describe("writeNote", () => {
  it("creates a note under the configured target", () => {
    const outcome = writeNote({
      contentRoot,
      repoRoot: root,
      item: item(),
    });
    expect(outcome.status).toBe("created");
    expect(outcome.absPath).toContain(path.join("posts", "随笔"));
    expect(fs.existsSync(outcome.absPath)).toBe(true);
    expect(outcome.relPath.startsWith("apps/web/src/posts/随笔/")).toBe(true);
  });

  it("returns unchanged when the same content is synced again", () => {
    const first = writeNote({ contentRoot, repoRoot: root, item: item() });
    const second = writeNote({
      contentRoot,
      repoRoot: root,
      item: item(),
      previous: first.record,
    });
    expect(second.status).toBe("unchanged");
    expect(second.absPath).toBe(first.absPath);
  });

  it("updates the file when the phone edits its own note", () => {
    const first = writeNote({ contentRoot, repoRoot: root, item: item() });
    const second = writeNote({
      contentRoot,
      repoRoot: root,
      item: item({ content: "新的内容", updatedAt: "2026-11-24T10:00:00.000Z" }),
      previous: first.record,
    });
    expect(second.status).toBe("updated");
    expect(fs.readFileSync(first.absPath, "utf8")).toContain("新的内容");
  });

  it("never overwrites a PC edit; writes a conflict copy instead", () => {
    const first = writeNote({ contentRoot, repoRoot: root, item: item() });
    fs.writeFileSync(first.absPath, `${fs.readFileSync(first.absPath, "utf8")}\n电脑上补充的内容\n`);
    const second = writeNote({
      contentRoot,
      repoRoot: root,
      item: item({ content: "手机版本" }),
      previous: first.record,
    });
    expect(second.status).toBe("conflict");
    expect(second.absPath).toContain(".conflict-");
    expect(fs.readFileSync(first.absPath, "utf8")).toContain("电脑上补充的内容");
  });

  it("keeps both files when a same-named note already exists", () => {
    writeNote({ contentRoot, repoRoot: root, item: item({ id: "a" }) });
    const second = writeNote({
      contentRoot,
      repoRoot: root,
      item: item({ id: "b", content: "不同内容" }),
    });
    expect(second.status).toBe("created");
    expect(second.absPath).not.toContain("雨天的测试笔记.md");
    expect(second.absPath).toContain("-2.md");
  });

  it("uses a stable filename based on the note date", () => {
    const outcome = writeNote({ contentRoot, repoRoot: root, item: item() });
    expect(path.basename(outcome.absPath)).toMatch(/^2026-11-23-雨天的测试笔记\.md$/);
  });
});

describe("writeImages", () => {
  it("writes images under public/images/mobile", () => {
    const data = Buffer.from("fake-image-bytes").toString("base64");
    const result = writeImages({
      contentRoot,
      repoRoot: root,
      item: item({ images: [{ name: "20261124-test.jpg", data }] }),
    });
    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toBe("apps/web/src/public/images/mobile/20261124-test.jpg");
    expect(fs.existsSync(path.join(contentRoot, "public", "images", "mobile", "20261124-test.jpg"))).toBe(true);
  });

  it("rejects path traversal in image names", () => {
    expect(() =>
      writeImages({
        contentRoot,
        repoRoot: root,
        item: item({ images: [{ name: "../evil.jpg", data: "aGVsbG8=" }] }),
      }),
    ).toThrow(/文件名/);
  });

  it("rejects corrupt base64", () => {
    expect(() =>
      writeImages({
        contentRoot,
        repoRoot: root,
        item: item({ images: [{ name: "broken.jpg", data: "not base64 ***" }] }),
      }),
    ).toThrow(/数据/);
  });
});
