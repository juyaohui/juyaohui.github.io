#!/usr/bin/env node
/**
 * One-shot migration from the old VuePress 1.x blog (G:\blog0614) to this
 * VitePress project.
 *
 *   node scripts/migrate-content.mjs --src "G:\blog0614"
 *
 * What it does
 *  - copies posts (blogs/**) into apps/web/src/posts/<category>/...
 *  - copies notes (notes/**) into apps/web/src/notes/...
 *  - normalises frontmatter (title/date/category/tags/cover/excerpt)
 *  - rewrites asset URLs to /images/...
 *  - converts the old `::: cardList` container into plain markdown
 *  - copies referenced static assets into apps/web/public/images
 *
 * It never modifies the source project.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "apps", "web");
const SRC_DIR = path.join(WEB, "src");
const PUBLIC_DIR = path.join(WEB, "public");

const args = process.argv.slice(2);
const srcArgIndex = args.indexOf("--src");
const SRC = path.resolve(srcArgIndex >= 0 ? args[srcArgIndex + 1] : "G:\\blog0614");
/** Wipe target trees first. Without it, existing files (including synced notes) are kept. */
const FORCE = args.includes("--force");

const ASSET_FOLDERS = ["bggroup", "essaypic", "gamepic", "pictures", "toppic"];
const ASSET_PREFIXES = [...ASSET_FOLDERS.map((f) => `/${f}/`), "/js/", "/bgm/"];
const ROOT_ASSETS = ["avatar01.png", "logo.png", "logo_ju.png", "hero.png"];

const CATEGORY_ORDER = ["技术栈", "菜鸡成长日志", "随笔", "其他"];

const report = {
  posts: [],
  notes: [],
  skipped: [],
  assets: 0,
  assetBytes: 0,
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function normalizeDate(value, fallback) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return fallback;
}

function fileMtimeDate(file) {
  try {
    return fs.statSync(file).mtime.toISOString().slice(0, 10);
  } catch {
    return "2022-01-01";
  }
}

/** The old repo has real history; use the last commit date when frontmatter has none. */
function gitDate(file) {
  try {
    const relative = path.relative(SRC, file).split(path.sep).join("/");
    const out = execFileSync("git", ["-C", SRC, "log", "-1", "--format=%ad", "--date=short", "--", relative], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
  } catch {
    /* not a git checkout */
  }
  return undefined;
}

function sourceDate(file, frontmatterDate) {
  if (frontmatterDate) {
    const normalized = normalizeDate(frontmatterDate, "");
    if (normalized) return normalized;
  }
  return gitDate(file) ?? fileMtimeDate(file);
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}.*$/gm, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[>*_`~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptOf(body, max = 140) {
  const text = plainText(body);
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

/** Rewrite old /public asset URLs to the new /images/ tree. */
function rewriteAssets(body) {
  let out = body;
  for (const prefix of ASSET_PREFIXES) {
    if (prefix === "/bgm/" || prefix === "/js/") continue;
    out = out.split(prefix).join(`/images${prefix}`);
  }
  for (const name of ROOT_ASSETS) {
    out = out.split(`](/${name})`).join(`](/images/${name})`);
    out = out.split(`src="/${name}"`).join(`src="/images/${name}"`);
  }
  // old links into the vuepress site
  out = out.replace(/\]\(\/notes\/([^)#]+)\)/g, (m, p) => `](/notes/${p.replace(/\.md$/, "")})`);
  return out;
}

/** Convert `::: cardList N` / `::: cardImgList N` yaml blocks into markdown. */
function convertCardList(body) {
  const re = /::: ?(cardList|cardImgList)[^\n]*\n([\s\S]*?)\n:::/g;
  return body.replace(re, (whole, kind, inner) => {
    const fence = inner.match(/```ya?ml\s*\n([\s\S]*?)```/);
    if (!fence) return "";
    let data;
    try {
      data = yaml.load(fence[1]);
    } catch {
      return "";
    }
    const list = Array.isArray(data) ? data : data?.list ?? [];
    if (kind === "cardImgList") {
      return list
        .map((item) => {
          const name = item.name ?? item.title ?? "";
          const desc = item.desc ?? item.description ?? "";
          const img = item.img ? `![${name}](${item.img})` : "";
          const link = item.link ? `[${name}](${item.link})` : `**${name}**`;
          return [img, `${link}${desc ? ` — ${desc}` : ""}`].filter(Boolean).join("\n");
        })
        .join("\n\n");
    }
    return list
      .map((item) => {
        const name = item.name ?? item.title ?? "link";
        const desc = item.desc ?? item.description ?? "";
        const url = item.link ? `[${name}](${item.link})` : `**${name}**`;
        return `- ${url}${desc ? ` — ${desc}` : ""}`;
      })
      .join("\n");
  });
}

function cleanBody(body, title) {
  let out = rewriteAssets(body).replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "");
  out = convertCardList(out);
  // Drop a duplicated leading H1 that repeats the frontmatter title.
  const h1 = out.match(/^\s*#\s+(.+?)\s*$/m);
  if (h1 && h1.index !== undefined) {
    const heading = h1[1].trim();
    if (heading === title.trim()) {
      out = out.slice(0, h1.index) + out.slice(h1.index + h1[0].length);
    }
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function quote(value) {
  return JSON.stringify(String(value));
}

function serialize({ title, date, category, tags, cover, excerpt }, body) {
  const lines = ["---", `title: ${quote(title)}`, `date: ${date}`, `category: ${quote(category)}`];
  if (tags.length) lines.push(`tags: ${JSON.stringify(tags)}`);
  if (cover) lines.push(`cover: ${quote(cover)}`);
  if (excerpt) lines.push(`excerpt: ${quote(excerpt)}`);
  lines.push("---", "", body, "");
  return lines.join("\n");
}

function copyAssets() {
  const publicSrc = path.join(SRC, ".vuepress", "public");
  if (!fs.existsSync(publicSrc)) return;
  const destRoot = path.join(PUBLIC_DIR, "images");
  ensureDir(destRoot);

  for (const folder of ASSET_FOLDERS) {
    const from = path.join(publicSrc, folder);
    if (!fs.existsSync(from)) continue;
    for (const file of walk(from)) {
      const rel = path.relative(publicSrc, file);
      const dest = path.join(destRoot, rel);
      ensureDir(path.dirname(dest));
      fs.copyFileSync(file, dest);
      report.assets += 1;
      report.assetBytes += fs.statSync(dest).size;
    }
  }
  for (const name of ROOT_ASSETS) {
    const from = path.join(publicSrc, name);
    if (fs.existsSync(from)) {
      const dest = path.join(destRoot, name);
      fs.copyFileSync(from, dest);
      report.assets += 1;
      report.assetBytes += fs.statSync(dest).size;
    }
  }
  const ico = path.join(publicSrc, "J.ico");
  if (fs.existsSync(ico)) fs.copyFileSync(ico, path.join(PUBLIC_DIR, "favicon.ico"));
}

function migratePosts() {
  const postsSrc = path.join(SRC, "blogs");
  const postsDest = path.join(SRC_DIR, "posts");
  if (FORCE) fs.rmSync(postsDest, { recursive: true, force: true });
  ensureDir(postsDest);

  const files = walk(postsSrc).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const rel = path.relative(postsSrc, file);
    const parts = rel.split(path.sep);
    const category = parts[0];
    const fileName = parts[parts.length - 1];

    // Category landing pages become the category description in site.ts.
    if (/^readme\.md$/i.test(fileName)) {
      report.skipped.push({ file: rel, reason: "category landing page (description kept in site.ts)" });
      continue;
    }

    const raw = stripBom(fs.readFileSync(file, "utf8"));
    let parsed;
    try {
      parsed = matter(raw);
    } catch (error) {
      report.skipped.push({ file: rel, reason: `frontmatter parse failed: ${error.message}` });
      continue;
    }
    const fm = parsed.data ?? {};
    const title =
      (typeof fm.title === "string" && fm.title.trim()) ||
      (raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "") ||
      path.basename(fileName, ".md").replace(/\.+$/, "");
    const date = sourceDate(file, fm.date);
    const tags = Array.isArray(fm.tags) ? fm.tags.map(String) : [];
    const cover = typeof fm.pic === "string" ? fm.pic : typeof fm.topPic === "string" ? fm.topPic : "";
    const coverUrl = cover ? cover.replace(/^\/(bggroup|essaypic|gamepic|pictures|toppic)\//, "/images/$1/") : "";
    const body = cleanBody(parsed.content, title);

    let outName = fileName.replace(/\.+\.md$/i, ".md").replace(/\.md$/i, ".md");
    outName = outName.replace(/\.+/g, ".");
    const outRel = path.join(category, ...parts.slice(1, -1), outName);
    const dest = path.join(postsDest, outRel);
    if (!FORCE && fs.existsSync(dest)) {
      report.skipped.push({ file: rel, reason: "目标已存在（加 --force 覆盖）" });
      continue;
    }
    ensureDir(path.dirname(dest));
    fs.writeFileSync(
      dest,
      serialize(
        { title, date, category, tags, cover: coverUrl, excerpt: excerptOf(body) },
        body,
      ),
      "utf8",
    );
    report.posts.push({ from: rel, to: path.relative(SRC_DIR, dest).replace(/\\/g, "/"), title, date });
  }
}

function migrateNotes() {
  const notesSrc = path.join(SRC, "notes");
  const notesDest = path.join(SRC_DIR, "notes");
  if (FORCE) fs.rmSync(notesDest, { recursive: true, force: true });
  ensureDir(notesDest);

  for (const file of walk(notesSrc).filter((f) => f.endsWith(".md"))) {
    const rel = path.relative(notesSrc, file);
    const parts = rel.split(path.sep);
    const fileName = parts[parts.length - 1];
    const raw = stripBom(fs.readFileSync(file, "utf8"));
    let parsed;
    try {
      parsed = matter(raw);
    } catch (error) {
      report.skipped.push({ file: `notes/${rel}`, reason: `frontmatter parse failed: ${error.message}` });
      continue;
    }
    const fm = parsed.data ?? {};
    const title =
      (typeof fm.title === "string" && fm.title.trim()) ||
      (raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "") ||
      path.basename(fileName, ".md").replace(/\.+$/, "");
    const date = sourceDate(file, fm.date);
    const tags = Array.isArray(fm.tags) ? fm.tags.map(String) : [];
    const body = cleanBody(parsed.content, title);
    const outName = /^readme\.md$/i.test(fileName) ? "index.md" : fileName;
    const outRel = path.join(...parts.slice(0, -1), outName);
    const dest = path.join(notesDest, outRel);
    if (!FORCE && fs.existsSync(dest)) {
      report.skipped.push({ file: `notes/${rel}`, reason: "目标已存在（加 --force 覆盖）" });
      continue;
    }
    ensureDir(path.dirname(dest));
    const lines = [
      "---",
      `title: ${quote(title)}`,
      `date: ${date}`,
      ...(tags.length ? [`tags: ${JSON.stringify(tags)}`] : []),
      "---",
      "",
      body,
      "",
    ];
    fs.writeFileSync(dest, lines.join("\n"), "utf8");
    report.notes.push({ from: `notes/${rel}`, to: path.relative(SRC_DIR, dest).replace(/\\/g, "/"), title });
  }
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`[migrate] source not found: ${SRC}`);
    process.exit(1);
  }
  console.log(`[migrate] source: ${SRC}`);
  copyAssets();
  migratePosts();
  migrateNotes();

  const md = [
    "# 内容迁移报告",
    "",
    `源目录：\`${SRC}\``,
    `生成时间：${new Date().toISOString()}`,
    "",
    `- 文章：${report.posts.length} 篇`,
    `- 笔记：${report.notes.length} 篇`,
    `- 静态资源：${report.assets} 个（${(report.assetBytes / 1024 / 1024).toFixed(1)} MB）`,
    `- 跳过：${report.skipped.length}`,
    "",
    "## 文章",
    "",
    "| 标题 | 日期 | 新路径 |",
    "| --- | --- | --- |",
    ...report.posts
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((p) => `| ${p.title.replace(/\|/g, "\\|")} | ${p.date} | \`${p.to}\` |`),
    "",
    "## 笔记",
    "",
    "| 标题 | 新路径 |",
    "| --- | --- |",
    ...report.notes.map((n) => `| ${n.title.replace(/\|/g, "\\|")} | \`${n.to}\` |`),
    "",
    "## 跳过",
    "",
    ...(report.skipped.length
      ? report.skipped.map((s) => `- \`${s.file}\` — ${s.reason}`)
      : ["- 无"]),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(ROOT, "docs", "migration-report.md"), md, "utf8");

  console.log(
    `[migrate] done: ${report.posts.length} posts, ${report.notes.length} notes, ${report.assets} assets`,
  );
  if (report.skipped.length) console.log(`[migrate] skipped ${report.skipped.length}`);
}

main();
