import { createContentLoader } from "vitepress";

export interface Post {
  url: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  cover?: string;
  excerpt: string;
  readingTime: number;
  year: string;
}

function toISODate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    const match = value.match(/\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  return "2022-01-01";
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<h[1-6][\s\S]*?<\/h[1-6]>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&ZeroWidthSpace;|&#8203;|&zwnj;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export default createContentLoader("posts/**/*.md", {
  excerpt: true,
  render: true,
  transform(raw): Post[] {
    return raw
      .filter((page) => !page.url.endsWith("/index.html") && !page.url.endsWith("/"))
      .map((page) => {
        const frontmatter = page.frontmatter as Record<string, unknown>;
        const date = toISODate(frontmatter.date);
        const segments = page.url.split("/").filter(Boolean);
        const category =
          typeof frontmatter.category === "string"
            ? frontmatter.category
            : decodeURIComponent(segments[1] ?? "其他");
        const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [];
        const cover =
          typeof frontmatter.cover === "string" && frontmatter.cover ? frontmatter.cover : undefined;
        const text = stripHtml(page.html ?? "");
        const excerpt = (page.excerpt ? stripHtml(page.excerpt) : text).slice(0, 160);
        const readingTime = Math.max(1, Math.round(text.replace(/\s+/g, "").length / 380));
        return {
          url: page.url.replace(/\.html$/, ""),
          title:
            (typeof frontmatter.title === "string" && frontmatter.title) ||
            page.url.split("/").pop()?.replace(/\.html$/, "") ||
            "无标题",
          date,
          category,
          tags,
          cover,
          excerpt,
          readingTime,
          year: date.slice(0, 4),
        } satisfies Post;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  },
});
