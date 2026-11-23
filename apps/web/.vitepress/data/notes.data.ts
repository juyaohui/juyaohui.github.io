import { createContentLoader } from "vitepress";

export interface Note {
  url: string;
  title: string;
  date: string;
  group: string;
}

const groups: Record<string, string> = {
  "": "开始",
  git: "Git",
  vue: "VuePress",
};

function groupOf(url: string): string {
  const segments = decodeURIComponent(url).split("/").filter(Boolean);
  const folder = segments[1] ?? "";
  return groups[folder] ?? "参考";
}

export default createContentLoader("notes/**/*.md", {
  transform(raw): Note[] {
    return raw
      .map((page) => {
        const frontmatter = page.frontmatter as Record<string, unknown>;
        const title =
          (typeof frontmatter.title === "string" && frontmatter.title) ||
          page.url.split("/").pop()?.replace(/\.html$/, "") ||
          "无标题";
        const date =
          typeof frontmatter.date === "string"
            ? frontmatter.date.slice(0, 10)
            : frontmatter.date instanceof Date
              ? frontmatter.date.toISOString().slice(0, 10)
              : "";
        return {
          url: page.url.replace(/\.html$/, ""),
          title,
          date,
          group: groupOf(page.url),
        } satisfies Note;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  },
});
