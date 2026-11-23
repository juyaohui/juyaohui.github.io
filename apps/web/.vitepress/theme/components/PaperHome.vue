<script setup lang="ts">
import { computed } from "vue";
import { withBase } from "vitepress";
import { data as postsData } from "../../data/posts.data";
import { data as notesData } from "../../data/notes.data";
import { categories, profile } from "../../site";

const posts = postsData;
const issue = computed(() => `VOL. ${String(Math.max(1, Math.ceil(posts.length / 8))).padStart(2, "0")}`);
const years = computed(() => Math.max(1, new Date().getFullYear() - profile.since));

const categoryStats = computed(() =>
  categories.map((category) => ({
    ...category,
    count: posts.filter((post) => post.category === category.name).length,
  })),
);

const pad = (index: number) => String(index + 1).padStart(2, "0");
</script>

<template>
  <article class="paper-home">
    <header class="masthead page">
      <div class="mast-meta">
        <span>PERSONAL JOURNAL</span>
        <span>{{ issue }} · SINCE {{ profile.since }}</span>
        <span>{{ profile.location }}</span>
      </div>
      <h1>
        {{ profile.name }}<em>的</em>个人主页
      </h1>
      <div class="mast-foot">
        <p>{{ profile.tagline }}</p>
        <span class="mast-stamp">{{ posts.length }} 篇文章 · {{ notesData.length }} 篇笔记 · {{ years }} 年</span>
      </div>
    </header>

    <section class="lead page">
      <div class="lead-main">
        <span class="rubric">卷首语</span>
        <h2>记录，是另一种<br />抵抗遗忘。</h2>
        <p>{{ profile.bio }}</p>
        <p class="lead-en">
          A quiet corner for code, notes and the days that slip away.
        </p>
        <div class="lead-actions">
          <a class="text-link" :href="withBase('/posts/')">阅读全部文章 <span>→</span></a>
          <a class="text-link muted" :href="withBase('/sync/')">手机同步 <span>→</span></a>
        </div>
      </div>

      <aside class="portrait">
        <figure>
          <img :src="withBase(profile.avatar)" :alt="profile.name" />
          <figcaption>{{ profile.name }} · {{ profile.role }}</figcaption>
        </figure>
        <dl>
          <div>
            <dt>现居</dt>
            <dd>{{ profile.location }}</dd>
          </div>
          <div>
            <dt>开始写作</dt>
            <dd>{{ profile.since }}</dd>
          </div>
          <div>
            <dt>存档</dt>
            <dd>{{ posts.length }} 篇 / {{ years }} 年</dd>
          </div>
          <div>
            <dt>最近</dt>
            <dd>{{ posts[0]?.date ?? "—" }}</dd>
          </div>
        </dl>
      </aside>
    </section>

    <section class="toc page">
      <header class="toc-head">
        <h2>目录</h2>
        <span>INDEX · {{ posts.length }} ENTRIES</span>
      </header>

      <ol class="toc-list">
        <li v-for="(post, index) in posts" :key="post.url">
          <a :href="withBase(post.url)">
            <span class="num">{{ pad(index) }}</span>
            <span class="title">{{ post.title }}</span>
            <span class="leader" />
            <span class="cat">{{ post.category }}</span>
            <span class="date">{{ post.date.replace(/-/g, ".") }}</span>
          </a>
        </li>
      </ol>

      <a class="toc-more" :href="withBase('/posts/')">按分类浏览全部文章 →</a>
    </section>

    <section class="page colophon">
      <div class="col-block">
        <h3>分类</h3>
        <ul class="cat-list">
          <li v-for="category in categoryStats" :key="category.name">
            <a :href="`${withBase('/posts/')}?category=${encodeURIComponent(category.name)}`">
              {{ category.name }}
              <span>{{ category.count }}</span>
            </a>
          </li>
        </ul>
      </div>

      <div class="col-block">
        <h3>最近笔记</h3>
        <ul class="note-list">
          <li v-for="note in notesData.slice(0, 4)" :key="note.url">
            <a :href="withBase(note.url)">{{ note.title }}</a>
          </li>
        </ul>
      </div>

      <div class="col-block sync-block">
        <h3>启事</h3>
        <p>
          手机与电脑在同一局域网时，可以用手机上的「一键同步」把随手记的笔记送进这台电脑，
          再自动提交到 GitHub。
        </p>
        <a class="text-link" :href="withBase('/sync/')">使用说明 →</a>
      </div>
    </section>
  </article>
</template>

<style scoped>
.paper-home {
  padding-top: 34px;
}

.masthead {
  padding-bottom: 26px;
  border-bottom: 1px solid var(--border-strong);
}

.mast-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  padding-bottom: 14px;
}

.masthead h1 {
  margin: 34px 0 26px;
  font-family: var(--font-display);
  font-weight: 500;
  font-size: clamp(52px, 11.5vw, 124px);
  line-height: 0.94;
  letter-spacing: -0.045em;
  color: var(--fg);
}

.masthead h1 em {
  font-style: normal;
  font-size: 0.34em;
  letter-spacing: 0.02em;
  color: var(--accent);
  margin: 0 0.12em;
  vertical-align: 0.5em;
}

.mast-foot {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-end;
  flex-wrap: wrap;
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

.mast-foot p {
  font-family: var(--font-display);
  font-size: 17px;
  color: var(--fg-2);
  max-width: 34em;
}

.mast-stamp {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: var(--muted);
}

/* lead */
.lead {
  display: grid;
  grid-template-columns: 1.35fr 0.65fr;
  gap: clamp(32px, 5vw, 80px);
  padding: 64px 0 56px;
  border-bottom: 1px solid var(--border);
}

.rubric {
  display: inline-block;
  margin-bottom: 20px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--accent);
}

.lead-main h2 {
  font-family: var(--font-display);
  font-size: clamp(34px, 4.6vw, 58px);
  font-weight: 500;
  line-height: 1.18;
  letter-spacing: -0.025em;
}

.lead-main > p {
  margin-top: 22px;
  max-width: 34em;
  color: var(--fg-2);
  font-size: 16px;
  line-height: 1.95;
}

.lead-en {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 14px !important;
  color: var(--muted) !important;
}

.lead-actions {
  display: flex;
  gap: 28px;
  margin-top: 32px;
}

.text-link {
  font-size: 13px;
  letter-spacing: 0.04em;
  color: var(--accent);
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
  padding-bottom: 2px;
}

.text-link span {
  display: inline-block;
  transition: transform 0.2s var(--ease);
}

.text-link:hover span {
  transform: translateX(4px);
}

.text-link.muted {
  color: var(--muted);
  border-color: var(--border-strong);
}

/* portrait */
.portrait figure {
  margin: 0 0 22px;
}

.portrait img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  border: 1px solid var(--border-strong);
  filter: grayscale(0.78) sepia(0.22) contrast(1.02) brightness(0.98);
  mix-blend-mode: multiply;
}

[data-mode="dark"] .portrait img {
  mix-blend-mode: normal;
  filter: grayscale(0.4) sepia(0.18) brightness(0.82);
}

.portrait figcaption {
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--muted);
  text-align: right;
}

.portrait dl {
  margin: 0;
  border-top: 1px solid var(--border);
}

.portrait dl div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}

.portrait dt {
  color: var(--muted);
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
}

.portrait dd {
  margin: 0;
  color: var(--fg-2);
}

/* toc */
.toc {
  padding: 56px 0 16px;
}

.toc-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  border-bottom: 2px solid var(--fg);
  padding-bottom: 10px;
}

.toc-head h2 {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
}

.toc-head span {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  color: var(--muted);
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc-list li {
  border-bottom: 1px solid var(--border);
}

.toc-list a {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 15px 2px;
  transition: padding 0.25s var(--ease), color 0.25s var(--ease);
}

.toc-list a:hover {
  padding-left: 10px;
  color: var(--accent);
}

.num {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--muted);
  width: 22px;
  flex-shrink: 0;
}

.title {
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.leader {
  flex: 1;
  border-bottom: 1px dotted var(--border-strong);
  transform: translateY(-4px);
  min-width: 24px;
}

.cat {
  font-size: 11px;
  color: var(--muted);
  flex-shrink: 0;
}

.date {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--muted);
  width: 78px;
  text-align: right;
  flex-shrink: 0;
}

.toc-more {
  display: inline-block;
  margin-top: 22px;
  font-size: 12px;
  color: var(--muted);
  border-bottom: 1px solid var(--border-strong);
}

.toc-more:hover {
  color: var(--accent);
}

/* colophon */
.colophon {
  display: grid;
  grid-template-columns: 1fr 1fr 1.3fr;
  gap: 40px;
  padding: 56px 0 20px;
  border-top: 1px solid var(--border);
  margin-top: 56px;
}

.col-block h3 {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 14px;
}

.cat-list,
.note-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.cat-list a,
.note-list a {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 0;
  font-size: 14px;
  color: var(--fg-2);
  border-bottom: 1px solid var(--border);
}

.cat-list a:hover,
.note-list a:hover {
  color: var(--accent);
}

.cat-list span {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
}

.sync-block p {
  font-size: 13px;
  line-height: 1.85;
  color: var(--fg-2);
  margin-bottom: 14px;
}

@media (max-width: 900px) {
  .lead {
    grid-template-columns: minmax(0, 1fr);
  }
  .portrait {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 20px;
    align-items: start;
  }
  .portrait figure {
    margin-bottom: 0;
  }
  .colophon {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}

@media (max-width: 620px) {
  .mast-meta span:nth-child(2) {
    display: none;
  }
  .masthead h1 {
    margin: 24px 0 18px;
  }
  .title {
    font-size: 16px;
  }
  .cat {
    display: none;
  }
  .date {
    width: 66px;
  }
  .portrait {
    grid-template-columns: 120px 1fr;
  }
}
</style>
