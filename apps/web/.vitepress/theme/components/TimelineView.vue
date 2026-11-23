<script setup lang="ts">
import { computed } from "vue";
import { withBase } from "vitepress";
import { data as postsData } from "../../data/posts.data";

const posts = postsData;

const groups = computed(() => {
  const map = new Map<string, typeof posts>();
  for (const post of posts) {
    const list = map.get(post.year) ?? [];
    list.push(post);
    map.set(post.year, list);
  }
  return [...map.entries()].map(([year, items]) => ({ year, items }));
});

const pad = (index: number) => String(index + 1).padStart(2, "0");
</script>

<template>
  <div class="timeline page">
    <header class="page-head">
      <span class="section-kicker">Timeline · {{ posts.length }} entries</span>
      <h1>时间线</h1>
      <p>所有文章按时间铺开，像一条不紧不慢的河。</p>
    </header>

    <div class="timeline-list">
      <section v-for="group in groups" :key="group.year" class="year-block">
        <header class="year-head">
          <span class="year">{{ group.year }}</span>
          <span class="count">{{ group.items.length }} 篇</span>
        </header>

        <div class="year-body">
          <a v-for="post in group.items" :key="post.url" class="tl-item" :href="withBase(post.url)">
            <span class="dot" />
            <span class="date">{{ post.date.slice(5) }}</span>
            <span class="title">{{ post.title }}</span>
            <span class="cat">{{ post.category }}</span>
          </a>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  padding-bottom: 60px;
}

.timeline-list {
  margin-top: 12px;
}

.year-block {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 32px;
  padding: 28px 0;
  border-top: 1px solid var(--border);
}

.year-head {
  position: sticky;
  top: calc(var(--header-h, 64px) + 24px);
  align-self: start;
}

.year-head .year {
  display: block;
  font-family: var(--font-display);
  font-size: clamp(30px, 4vw, 44px);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--fg);
}

.year-head .count {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.year-body {
  display: flex;
  flex-direction: column;
}

.tl-item {
  position: relative;
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) 110px;
  gap: 14px;
  align-items: baseline;
  padding: 13px 0 13px 18px;
  border-bottom: 1px dashed var(--border);
  transition: padding 0.2s var(--ease);
}

.tl-item:hover {
  padding-left: 24px;
}

.tl-item:hover .title {
  color: var(--accent);
}

.dot {
  position: absolute;
  left: 0;
  top: 22px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--border-strong);
}

.tl-item:hover .dot {
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.date {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--muted);
}

.title {
  font-size: 15.5px;
  color: var(--fg-2);
  transition: color 0.2s var(--ease);
}

.cat {
  font-size: 11px;
  color: var(--muted);
  text-align: right;
}

@media (max-width: 760px) {
  .year-block {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
  .year-head {
    position: static;
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .year-head .year {
    font-size: 30px;
  }
  .tl-item {
    grid-template-columns: 48px minmax(0, 1fr);
  }
  .cat {
    display: none;
  }
}
</style>
