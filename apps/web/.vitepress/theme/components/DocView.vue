<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useData, withBase } from "vitepress";
import { data as postsData } from "../../data/posts.data";
import { data as notesData } from "../../data/notes.data";

const { page, frontmatter } = useData();
const sidebarOpen = ref(false);

const normalize = (value: string) =>
  decodeURIComponent(value).replace(/\.html$/, "").replace(/\/$/, "");

const relativePath = computed(() => page.value.relativePath ?? "");
const isPost = computed(() => relativePath.value.startsWith("posts/"));
const isNotes = computed(() => relativePath.value.startsWith("notes/"));

const currentPath = computed(() => {
  const withoutExt = relativePath.value.replace(/\.md$/, "").replace(/\/index$/, "/");
  return normalize(`/${withoutExt}`);
});

const post = computed(() =>
  postsData.find((item) => normalize(item.url) === currentPath.value),
);

const index = computed(() =>
  postsData.findIndex((item) => normalize(item.url) === currentPath.value),
);

const newer = computed(() => (index.value > 0 ? postsData[index.value - 1] : undefined));
const older = computed(() =>
  index.value >= 0 && index.value < postsData.length - 1 ? postsData[index.value + 1] : undefined,
);

const groupOrder = ["开始", "Git", "VuePress", "参考"];
const groups = computed(() => {
  const map = new Map<string, typeof notesData>();
  for (const note of notesData) {
    const list = map.get(note.group) ?? [];
    list.push(note);
    map.set(note.group, list);
  }
  return [...map.entries()]
    .sort((a, b) => {
      const ai = groupOrder.indexOf(a[0]);
      const bi = groupOrder.indexOf(b[0]);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    })
    .map(([name, items]) => ({ name, items }));
});

interface OutlineItem {
  level: number;
  title: string;
  slug: string;
}

const outline = ref<OutlineItem[]>([]);

/** VitePress page.headers is empty in this custom theme; read the rendered headings. */
function buildOutline() {
  if (typeof document === "undefined") return;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(".prose h2, .prose h3"));
  outline.value = nodes
    .map((el) => ({
      level: el.tagName === "H2" ? 2 : 3,
      title: (el.textContent ?? "").replace(/\u200b/g, "").replace(/^#+\s*/, "").trim(),
      slug: el.id,
    }))
    .filter((item) => item.slug && item.title);
}

onMounted(buildOutline);

watch(
  () => page.value.relativePath,
  async () => {
    await nextTick();
    window.setTimeout(buildOutline, 30);
  },
);

const title = computed(
  () => post.value?.title ?? (typeof frontmatter.value.title === "string" ? frontmatter.value.title : "文档"),
);
const date = computed(() => post.value?.date ?? "");
const category = computed(() => post.value?.category ?? "");
const tags = computed(() => post.value?.tags ?? []);
const readingTime = computed(() => post.value?.readingTime ?? 0);
const cover = computed(() => post.value?.cover ?? "");

const editUrl = computed(
  () =>
    `https://github.com/juyaohui/juyaohui.github.io/edit/master/apps/web/src/${relativePath.value}`,
);

const isActiveNote = (url: string) => normalize(url) === currentPath.value;
</script>

<template>
  <div class="doc-wrap">
    <div class="doc-grid" :class="{ 'has-sidebar': isNotes }">
      <aside v-if="isNotes" class="doc-sidebar" :class="{ 'is-open': sidebarOpen }">
        <div v-for="group in groups" :key="group.name" class="sidebar-group">
          <h3>{{ group.name }}</h3>
          <a
            v-for="note in group.items"
            :key="note.url"
            class="sidebar-link"
            :class="{ 'is-active': isActiveNote(note.url) }"
            :href="withBase(note.url)"
          >
            {{ note.title }}
          </a>
        </div>
      </aside>

      <article class="doc-main">
        <button
          v-if="isNotes"
          type="button"
          class="btn btn--ghost btn--sm sidebar-toggle"
          @click="sidebarOpen = !sidebarOpen"
        >
          {{ sidebarOpen ? "收起目录" : "文档目录" }}
        </button>

        <header v-if="isPost" class="post-header">
          <div class="post-eyebrow">
            <a class="chip" :href="`${withBase('/posts/')}?category=${encodeURIComponent(category)}`">
              {{ category }}
            </a>
            <span>{{ date.replace(/-/g, ".") }}</span>
            <span>·</span>
            <span>{{ readingTime }} 分钟阅读</span>
            <a class="edit" :href="editUrl" target="_blank" rel="noreferrer">编辑 ↗</a>
          </div>
          <h1 class="post-title">{{ title }}</h1>
          <img v-if="cover" class="post-cover" :src="withBase(cover)" :alt="title" />
        </header>

        <header v-else class="doc-header">
          <span v-if="isNotes" class="section-kicker">Notes</span>
          <h1>{{ title }}</h1>
          <div class="doc-meta">
            <span v-if="date">{{ date }}</span>
            <a :href="editUrl" target="_blank" rel="noreferrer">在 GitHub 编辑 ↗</a>
          </div>
        </header>

        <div class="prose">
          <slot />
        </div>

        <footer v-if="isPost" class="post-footer">
          <div class="post-tags">
            <a
              v-for="tag in tags"
              :key="tag"
              class="chip"
              :href="`${withBase('/posts/')}?tag=${encodeURIComponent(tag)}`"
            >
              #{{ tag }}
            </a>
          </div>

          <nav class="post-nav">
            <a v-if="newer" :href="withBase(newer.url)">
              <span>← 更新一篇</span>
              <strong>{{ newer.title }}</strong>
            </a>
            <span v-else />
            <a v-if="older" class="is-next" :href="withBase(older.url)">
              <span>更早一篇 →</span>
              <strong>{{ older.title }}</strong>
            </a>
          </nav>
        </footer>
      </article>

      <aside v-if="outline.length" class="doc-outline">
        <h3>本页目录</h3>
        <a
          v-for="item in outline"
          :key="item.slug"
          class="outline-link"
          :class="`depth-${item.level}`"
          :href="`#${item.slug}`"
        >
          {{ item.title }}
        </a>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.doc-header {
  margin-bottom: 30px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--border);
}

.doc-header h1 {
  font-size: clamp(28px, 4vw, 40px);
  letter-spacing: -0.025em;
}

.doc-meta {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
}

.doc-meta a:hover {
  color: var(--accent);
}

.post-eyebrow .edit {
  margin-left: auto;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 11px;
}

.post-eyebrow .edit:hover {
  color: var(--accent);
}

@media (max-width: 760px) {
  .post-eyebrow .edit {
    display: none;
  }
}
</style>
