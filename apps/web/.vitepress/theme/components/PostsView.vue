<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { withBase } from "vitepress";
import { data as postsData } from "../../data/posts.data";
import { categories } from "../../site";

const posts = postsData;
const activeCategory = ref("全部");
const keyword = ref("");
const activeTag = ref("");
const sort = ref<"new" | "old">("new");

const categoryNames = computed(() => ["全部", ...categories.map((category) => category.name)]);

const counts = computed(() => {
  const map = new Map<string, number>();
  for (const post of posts) map.set(post.category, (map.get(post.category) ?? 0) + 1);
  return map;
});

const filtered = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  const list = posts.filter((post) => {
    if (activeCategory.value !== "全部" && post.category !== activeCategory.value) return false;
    if (activeTag.value && !post.tags.includes(activeTag.value)) return false;
    if (!text) return true;
    return (
      post.title.toLowerCase().includes(text) ||
      post.excerpt.toLowerCase().includes(text) ||
      post.tags.some((tag) => tag.toLowerCase().includes(text))
    );
  });
  return sort.value === "new" ? list : [...list].reverse();
});

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");
  const tag = params.get("tag");
  const q = params.get("q");
  if (category && categoryNames.value.includes(category)) activeCategory.value = category;
  if (tag) activeTag.value = tag;
  if (q) keyword.value = q;
});

function clearFilters() {
  activeCategory.value = "全部";
  activeTag.value = "";
  keyword.value = "";
}
</script>

<template>
  <div class="posts-page page">
    <header class="page-head">
      <span class="section-kicker">Archive · {{ posts.length }} posts</span>
      <h1>文章</h1>
      <p>从 2022 年开始写下的技术笔记与生活随笔，按时间倒序排列。</p>
    </header>

    <div class="filter-bar">
      <div class="chips">
        <button
          v-for="name in categoryNames"
          :key="name"
          type="button"
          class="chip filter-chip"
          :class="{ 'is-active': activeCategory === name }"
          @click="activeCategory = name"
        >
          {{ name }}
          <span v-if="name !== '全部'" class="chip-count">{{ counts.get(name) ?? 0 }}</span>
        </button>
        <button v-if="activeTag" type="button" class="chip filter-chip is-tag" @click="activeTag = ''">
          #{{ activeTag }} ×
        </button>
      </div>

      <div class="filter-tools">
        <label class="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" stroke-linecap="round" />
          </svg>
          <input v-model="keyword" type="search" placeholder="筛选标题、标签…" aria-label="筛选文章" />
        </label>
        <button class="sort-btn" type="button" @click="sort = sort === 'new' ? 'old' : 'new'">
          {{ sort === "new" ? "最新优先" : "最早优先" }}
        </button>
      </div>
    </div>

    <p class="result-count">
      共 {{ filtered.length }} 篇
      <button v-if="activeCategory !== '全部' || keyword || activeTag" type="button" @click="clearFilters">
        清除筛选
      </button>
    </p>

    <div v-if="filtered.length" class="post-list">
      <a v-for="post in filtered" :key="post.url" class="post-row" :href="withBase(post.url)">
        <div class="row-date">
          <span class="year">{{ post.year }}</span>
          <span class="md">{{ post.date.slice(5) }}</span>
        </div>

        <div class="row-main">
          <h2>{{ post.title }}</h2>
          <p>{{ post.excerpt }}</p>
          <div class="row-tags">
            <span class="row-cat">{{ post.category }}</span>
            <span v-for="tag in post.tags" :key="tag" class="row-tag">#{{ tag }}</span>
            <span class="row-time">{{ post.readingTime }} min</span>
          </div>
        </div>

        <div v-if="post.cover" class="row-thumb" :style="{ backgroundImage: `url(${withBase(post.cover)})` }" />
        <div v-else class="row-arrow" aria-hidden="true">→</div>
      </a>
    </div>

    <div v-else class="empty">
      没有匹配的文章，换个关键词试试。
    </div>
  </div>
</template>

<style scoped>
.posts-page {
  padding-bottom: 40px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: var(--header-h, 64px);
  z-index: 30;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(14px);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  cursor: pointer;
  height: 30px;
}

.filter-chip.is-active {
  color: var(--bg);
  background: var(--accent);
  border-color: var(--accent);
  font-weight: 600;
}

.chip-count {
  opacity: 0.6;
  font-family: var(--font-mono);
  font-size: 10px;
}

.filter-chip.is-tag {
  border-color: var(--accent);
  color: var(--accent);
}

.filter-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
  background: var(--surface);
}

.search-box input {
  width: 150px;
  border: 0;
  outline: 0;
  background: none;
  color: var(--fg);
  font-size: 12.5px;
}

.sort-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}

.sort-btn:hover {
  color: var(--fg);
  border-color: var(--border-strong);
}

.result-count {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 2px 8px;
  font-size: 12px;
  color: var(--muted);
  font-family: var(--font-mono);
}

.result-count button {
  color: var(--accent);
  font-size: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
}

.post-list {
  display: flex;
  flex-direction: column;
}

.post-row {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr) 96px;
  gap: 22px;
  align-items: center;
  padding: 24px 4px;
  border-bottom: 1px solid var(--border);
  transition: padding 0.25s var(--ease), background 0.25s var(--ease);
}

.post-row:hover {
  padding-left: 12px;
  background: color-mix(in srgb, var(--surface) 55%, transparent);
}

.row-date {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--font-mono);
  color: var(--muted);
}

.row-date .year {
  font-size: 11px;
  letter-spacing: 0.1em;
}

.row-date .md {
  font-size: 15px;
  color: var(--fg-2);
}

.row-main {
  min-width: 0;
}

.row-main h2 {
  font-size: 19px;
  letter-spacing: -0.015em;
  line-height: 1.35;
}

.post-row:hover h2 {
  color: var(--accent);
}

.row-main p {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.65;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  font-size: 11px;
  color: var(--muted);
}

.row-cat {
  color: var(--accent);
}

.row-tag {
  font-family: var(--font-mono);
}

.row-time {
  font-family: var(--font-mono);
  opacity: 0.7;
}

.row-thumb {
  width: 96px;
  height: 64px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  border: 1px solid var(--border);
}

.row-arrow {
  text-align: right;
  color: var(--muted);
  font-size: 18px;
  transition: transform 0.25s var(--ease), color 0.25s var(--ease);
}

.post-row:hover .row-arrow {
  color: var(--accent);
  transform: translateX(4px);
}

.empty {
  padding: 80px 0;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}

@media (max-width: 760px) {
  .filter-bar {
    position: static;
  }
  .post-row {
    grid-template-columns: 52px minmax(0, 1fr);
    gap: 14px;
    padding: 18px 2px;
  }
  .row-thumb,
  .row-arrow {
    display: none;
  }
  .row-date .md {
    font-size: 13px;
  }
  .row-main h2 {
    font-size: 16.5px;
  }
  .search-box input {
    width: 100px;
  }
}
</style>
