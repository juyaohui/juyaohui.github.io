<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { withBase } from "vitepress";
import { data as postsData } from "../../data/posts.data";
import { data as notesData } from "../../data/notes.data";
import { categories, mottos, profile } from "../../site";

const posts = postsData;
const years = computed(() => Math.max(1, new Date().getFullYear() - profile.since));
const latest = computed(() => posts.slice(0, 6));
const notes = computed(() => notesData.slice(0, 5));

const categoryStats = computed(() =>
  categories.map((category) => ({
    ...category,
    count: posts.filter((post) => post.category === category.name).length,
  })),
);

const mottoIndex = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  timer = setInterval(() => {
    mottoIndex.value = (mottoIndex.value + 1) % mottos.length;
  }, 7000);
});
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
const motto = computed(() => mottos[mottoIndex.value] ?? mottos[0]!);
const pad = (index: number) => String(index + 1).padStart(2, "0");
</script>

<template>
  <div class="mono-home">
    <section class="hero page">
      <div class="terminal">
        <div class="term-bar">
          <span class="lights"><i /><i /><i /></span>
          <span class="term-title">jade@home: ~/site — zsh</span>
          <span class="term-meta">80×24</span>
        </div>
        <div class="term-body">
          <p><span class="prompt">$</span> <span class="cmd">whoami</span></p>
          <p class="out">
            <span class="hl">{{ profile.name }}</span> — {{ profile.role }} / {{ profile.location }}
          </p>

          <p><span class="prompt">$</span> <span class="cmd">cat ./motto.txt</span></p>
          <p class="out muted">"{{ motto.zh }}"</p>

          <p><span class="prompt">$</span> <span class="cmd">ls -1 posts/</span></p>
          <p class="out dirs">
            <span v-for="category in categories" :key="category.name">{{ category.name }}/</span>
          </p>

          <p>
            <span class="prompt">$</span>
            <span class="cmd">./sync --phone</span>
            <span class="cursor" />
          </p>
          <p class="out muted">ready · waiting for device on 192.168.x.x …</p>
        </div>
      </div>

      <aside class="sysinfo">
        <p class="label">// SYSINFO</p>
        <div class="kv"><span>uptime</span><b>{{ years }} years</b></div>
        <div class="kv"><span>posts</span><b>{{ posts.length }}</b></div>
        <div class="kv"><span>notes</span><b>{{ notesData.length }}</b></div>
        <div class="kv"><span>stack</span><b>vitepress / ts</b></div>
        <div class="kv"><span>sync</span><b class="ok">lan ready</b></div>
        <div class="sys-actions">
          <a class="btn btn--primary btn--sm" :href="withBase('/posts/')">阅读文章</a>
          <a class="btn btn--ghost btn--sm" :href="withBase('/sync/')">手机同步</a>
        </div>
      </aside>
    </section>

    <section class="page stats-row">
      <div class="stat"><span>POSTS</span><strong>{{ posts.length }}</strong></div>
      <div class="stat"><span>NOTES</span><strong>{{ notesData.length }}</strong></div>
      <div class="stat"><span>CATEGORIES</span><strong>{{ categories.length }}</strong></div>
      <div class="stat"><span>SINCE</span><strong>{{ profile.since }}</strong></div>
    </section>

    <section class="page log">
      <div class="log-head">
        <h2>// LATEST_POSTS</h2>
        <a :href="withBase('/posts/')">all →</a>
      </div>
      <div class="log-table">
        <a v-for="(post, index) in latest" :key="post.url" class="log-row" :href="withBase(post.url)">
          <span class="idx">[{{ pad(index) }}]</span>
          <span class="title">{{ post.title }}</span>
          <span class="cat">{{ post.category }}</span>
          <span class="date">{{ post.date }}</span>
        </a>
      </div>
    </section>

    <section class="page grid2">
      <div class="panel">
        <h3>// CATEGORIES</h3>
        <a
          v-for="category in categoryStats"
          :key="category.name"
          class="cat-line"
          :href="`${withBase('/posts/')}?category=${encodeURIComponent(category.name)}`"
        >
          <span class="arrow">→</span>
          <span class="name">{{ category.name }}</span>
          <span class="dots" />
          <span class="count">{{ category.count }}</span>
        </a>
      </div>

      <div class="panel">
        <h3>// NOTES</h3>
        <a v-for="note in notes" :key="note.url" class="cat-line" :href="withBase(note.url)">
          <span class="arrow">→</span>
          <span class="name">{{ note.title }}</span>
          <span class="dots" />
        </a>
        <a class="panel-more" :href="withBase('/notes/')">cd ../notes →</a>
      </div>

      <div class="panel sync-panel">
        <h3>// PHONE_SYNC</h3>
        <p>同一局域网下，手机打开同步面板，一键把笔记写入这台电脑并 push 到 GitHub。</p>
        <div class="sync-cmd"><span class="prompt">$</span> pnpm sync</div>
        <a class="btn btn--primary btn--sm" :href="withBase('/sync/')">查看说明</a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.mono-home {
  padding-top: 40px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(260px, 0.5fr);
  gap: 28px;
  align-items: start;
}

.terminal {
  border: 1px solid var(--border-strong);
  background: #0a0d11;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.55);
}

[data-mode="light"] .terminal {
  background: #151a1f;
}

.term-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: #7b8794;
  background: #0d1116;
}

.lights {
  display: inline-flex;
  gap: 6px;
}

.lights i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #2a333c;
}

.lights i:first-child {
  background: #b6f36b;
}

.term-title {
  flex: 1;
  text-align: center;
  letter-spacing: 0.04em;
}

.term-meta {
  opacity: 0.6;
}

.term-body {
  padding: 24px 26px 30px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 2;
  color: #d8e2ea;
}

.term-body p {
  margin: 0;
}

.prompt {
  color: #b6f36b;
  margin-right: 6px;
}

.cmd {
  color: #e8f0f7;
}

.out {
  color: #93a3b1;
  margin-bottom: 10px !important;
  padding-left: 18px;
}

.out.muted {
  color: #6f7f8c;
}

.hl {
  color: #b6f36b;
}

.dirs span {
  color: #7dd3fc;
  margin-right: 10px;
}

.cursor {
  display: inline-block;
  width: 8px;
  height: 15px;
  margin-left: 4px;
  background: #b6f36b;
  vertical-align: -2px;
  animation: blink 1.1s steps(2, start) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

/* sysinfo */
.sysinfo {
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 20px;
  font-family: var(--font-mono);
  font-size: 11.5px;
}

.label {
  color: #b6f36b;
  letter-spacing: 0.16em;
  margin-bottom: 14px;
}

.kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--border);
}

.kv span {
  color: var(--muted);
}

.kv b {
  color: var(--fg-2);
  font-weight: 400;
}

.kv b.ok {
  color: #b6f36b;
}

.sys-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

/* stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-top: 22px;
  border: 1px solid var(--border);
}

.stat {
  padding: 18px 20px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat:last-child {
  border-right: 0;
}

.stat span {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  color: var(--muted);
}

.stat strong {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 500;
  color: var(--fg);
}

/* log */
.log {
  margin-top: 52px;
}

.log-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-strong);
  padding-bottom: 10px;
  font-family: var(--font-mono);
}

.log-head h2 {
  font-size: 12px;
  letter-spacing: 0.16em;
  color: #b6f36b;
  font-weight: 500;
}

.log-head a {
  font-size: 11px;
  color: var(--muted);
}

.log-table {
  display: flex;
  flex-direction: column;
}

.log-row {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 120px 96px;
  gap: 14px;
  align-items: baseline;
  padding: 13px 6px;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 12.5px;
  transition: background 0.2s var(--ease), padding 0.2s var(--ease);
}

.log-row:hover {
  background: var(--surface);
  padding-left: 12px;
  color: #b6f36b;
}

.idx {
  color: var(--muted);
}

.title {
  color: var(--fg-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-row:hover .title {
  color: #b6f36b;
}

.cat {
  color: var(--muted);
  font-size: 11px;
  text-align: right;
}

.date {
  color: var(--muted);
  font-size: 11px;
  text-align: right;
}

/* grid2 */
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 48px;
}

.panel {
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 22px;
  font-family: var(--font-mono);
  font-size: 12.5px;
}

.panel h3 {
  font-size: 10.5px;
  letter-spacing: 0.18em;
  color: #b6f36b;
  font-weight: 500;
  margin-bottom: 16px;
}

.cat-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--border);
  color: var(--fg-2);
}

.cat-line:hover {
  color: #b6f36b;
}

.arrow {
  color: var(--muted);
}

.dots {
  flex: 1;
  border-bottom: 1px dotted var(--border);
  transform: translateY(-3px);
}

.count {
  color: var(--muted);
}

.panel-more {
  display: inline-block;
  margin-top: 14px;
  font-size: 11px;
  color: var(--muted);
}

.sync-panel p {
  color: var(--muted);
  line-height: 1.8;
  margin-bottom: 14px;
}

.sync-cmd {
  border: 1px solid var(--border);
  background: var(--bg);
  padding: 10px 12px;
  margin-bottom: 14px;
  color: var(--fg-2);
}

@media (max-width: 960px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
  }
  .grid2 {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 620px) {
  .stats-row {
    grid-template-columns: 1fr 1fr;
  }
  .stat:nth-child(2n) {
    border-right: 0;
  }
  .stat:nth-child(-n + 2) {
    border-bottom: 1px solid var(--border);
  }
  .log-row {
    grid-template-columns: 40px minmax(0, 1fr) 76px;
  }
  .log-row .cat {
    display: none;
  }
  .term-body {
    padding: 18px;
    font-size: 12px;
  }
}
</style>
