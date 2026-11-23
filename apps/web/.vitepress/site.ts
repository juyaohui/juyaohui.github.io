export type StyleId = "aurora" | "paper" | "mono";
export type Mode = "light" | "dark";

export interface StyleMeta {
  id: StyleId;
  name: string;
  en: string;
  tagline: string;
  description: string;
  keywords: string[];
  /** Swatch colours shown in the style picker. */
  swatch: [string, string, string];
  defaultMode: Mode;
}

export const styles: StyleMeta[] = [
  {
    id: "aurora",
    name: "极光",
    en: "Aurora",
    tagline: "深夜里的光",
    description:
      "深色底 + 玻璃拟态卡片 + 流动的渐变光晕。视觉冲击最强，适合展示个人品牌与作品，夜里看也很舒服。",
    keywords: ["玻璃拟态", "渐变光晕", "深色", "现代"],
    swatch: ["#0b1020", "#7dd3fc", "#a78bfa"],
    defaultMode: "dark",
  },
  {
    id: "paper",
    name: "纸墨",
    en: "Paper",
    tagline: "像一本慢慢翻的杂志",
    description:
      "米白纸张、衬线标题、细线与编号。阅读感最好，适合以长文和随笔为主的博客，安静、克制、耐看。",
    keywords: ["编辑排版", "衬线", "米白", "克制"],
    swatch: ["#f7f3ea", "#b4442c", "#2b2622"],
    defaultMode: "light",
  },
  {
    id: "mono",
    name: "终端",
    en: "Mono",
    tagline: "一格一格的终端窗口",
    description:
      "近黑底色、等宽字体、酸性绿点缀和 1px 网格。极客味道最浓，适合技术笔记、代码和命令行爱好者。",
    keywords: ["终端", "等宽", "网格", "极客"],
    swatch: ["#0a0c0f", "#b6f36b", "#ffb86b"],
    defaultMode: "dark",
  },
];

export const defaultStyle: StyleId = "mono";
export const defaultMode: Mode = "dark";

export const profile = {
  name: "Jade",
  handle: "juyaohui",
  avatar: "/images/avatar01.png",
  role: "前端 / 记录者",
  tagline: "在代码与生活之间，记录一些不想忘记的东西。",
  bio: "白天写前端，晚上折腾博客、拍点照片、打两把游戏。这里放着我的文章、笔记，以及那些一晃而过的日子。",
  location: "China",
  since: 2022,
  github: "https://github.com/juyaohui",
  siteUrl: "https://juyaohui.github.io/",
};

export interface CategoryMeta {
  name: string;
  en: string;
  description: string;
  icon: string;
}

export const categories: CategoryMeta[] = [
  {
    name: "技术栈",
    en: "Stack",
    description: "前端、后端、AI 与运维的碎片笔记。",
    icon: "▚",
  },
  {
    name: "菜鸡成长日志",
    en: "Growth",
    description: "从 2022 年开始的踩坑、报错与一点点进步。",
    icon: "▲",
  },
  {
    name: "随笔",
    en: "Essays",
    description: "风轻月明，一些日常与不必要的思考。",
    icon: "≈",
  },
  {
    name: "其他",
    en: "Misc",
    description: "放不下别的分类的东西。",
    icon: "◇",
  },
];

export const mottos = [
  { zh: "知其不可奈何而安之若命。", en: "Life comes and goes, but the future is not long." },
  { zh: "满朝公卿，夜哭到明，明哭到夜，还能哭死董卓否？", en: "It's pointless to express emotions." },
  {
    zh: "我们登上并非我们所选择的舞台，演出并非我们所选择的剧本。",
    en: "We're on a stage that we didn't choose, and the show wasn't the script we chose.",
  },
  { zh: "再见少年拉满弓，不惧光阴不惧风。", en: "Crossing the river, there are thousands of Hibiscus." },
  { zh: "一别两三年，忽然又夏天。", en: "Two or three years later, it was summer again." },
  { zh: "未成定局的事就不要弄的人尽皆知。", en: "Don't do anything that's not settled but everyone knows it." },
  { zh: "也许明天的我会痛恨自己，但今夜的我仍在前行。", en: "I might hate myself tomorrow, but I'm on my way tonight." },
];

export const nav = [
  { text: "首页", link: "/" },
  { text: "文章", link: "/posts/" },
  { text: "时间线", link: "/timeline/" },
  { text: "笔记", link: "/notes/" },
  { text: "样式", link: "/styles/" },
  { text: "手机同步", link: "/sync/" },
];

export const social = [
  { text: "GitHub", link: "https://github.com/juyaohui" },
  { text: "RSS", link: "/feed.xml" },
];
