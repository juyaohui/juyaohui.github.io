<script setup lang="ts">
import { computed } from "vue";
import { withBase } from "vitepress";
import { data as postsData } from "../../data/posts.data";
import { data as notesData } from "../../data/notes.data";

interface TimelineEntry {
  url: string;
  title: string;
  date: string;
  type: "文章" | "笔记";
  kind: string;
}

const posts = postsData;

const entries = computed<TimelineEntry[]>(() => {
  const list: TimelineEntry[] = [
    ...posts.map((post) => ({
      url: post.url,
      title: post.title,
      date: post.date,
      type: "文章" as const,
      kind: post.category,
    })),
    ...notesData.map((note) => ({
      url: note.url,
      title: note.title,
      date: note.date,
      type: "笔记" as const,
      kind: note.group,
    })),
  ].filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date));
  return list.sort((a, b) => b.date.localeCompare(a.date));
});

const groups = computed(() => {
  const map = new Map<string, TimelineEntry[]>();
  for (const entry of entries.value) {
    const year = entry.date.slice(0, 4);
    const list = map.get(year) ?? [];
    list.push(entry);
    map.set(year, list);
  }
  return [...map.entries()].map(([year, items]) => ({ year, items }));
});
</script>

<template>
  <div class="timeline page">
    <header class="page-head">
      <span class="section-kicker">Timeline · {{ entries.length }} documents</span>
      <h1>时间线</h1>
      <p>所有文章与笔记都放在这里，按时间铺开，像一条不紧不慢的河。</p>
    </header>

    <div class="timeline-list">
      <section v-for="group in groups" :key="group.year" class="year-block">
        <header class="year-head">
          <span class="year">{{ group.year }}</span>
          <span class="count">{{ group.items.length }} 篇</span>
        </header>

        <div class="year-body">
          <a
            v-for="entry in group.items"
            :key="entry.type + entry.url"
            class="tl-item"
            :class="{ 'is-note': entry.type === '笔记' }"
            :href="withBase(entry.url)"
          >
            <span class="dot" />
            <span class="date">{{ entry.date.slice(5) }}</span>
            <span class="title">{{ entry.title }}</span>
            <span class="type">{{ entry.type }}</span>
            <span class="cat">{{ entry.kind }}</span>
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
  grid-template-columns: 54px minmax(0, 1fr) 44px 110px;
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

.type {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 1px 6px;
  text-align: center;
  white-space: nowrap;
}

.tl-item.is-note .type {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

.tl-item.is-note .dot {
  background: var(--accent);
  opacity: 0.55;
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
    grid-template-columns: 48px minmax(0, 1fr) 40px;
  }
  .cat {
    display: none;
  }
}
</style>
