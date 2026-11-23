<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { withBase } from "vitepress";
import { data as postsData } from "../../data/posts.data";
import { data as notesData } from "../../data/notes.data";
import { categories, mottos, profile } from "../../site";

const posts = postsData;
const latest = computed(() => posts.slice(0, 3));
const notes = computed(() => notesData.slice(0, 4));
const years = computed(() => Math.max(1, new Date().getFullYear() - profile.since));

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
  }, 9000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});

const motto = computed(() => mottos[mottoIndex.value] ?? mottos[0]!);
</script>

<template>
  <section class="hero">
    <div class="hero-inner page">
      <div class="hero-copy">
        <p class="eyebrow">
          <span class="pulse" />
          PERSONAL SPACE · SINCE {{ profile.since }}
        </p>

        <h1 class="hero-title">
          你好，我是
          <span class="gradient">{{ profile.name }}</span>
          <span class="dot">.</span>
          <br />
          <span class="hero-sub">写代码，也写生活。</span>
        </h1>

        <p class="lead">{{ profile.tagline }}</p>

        <div class="hero-actions">
          <a class="btn btn--primary" :href="withBase('/posts/')">阅读文章</a>
          <a class="btn btn--ghost" :href="withBase('/sync/')">
            <span class="dot-live" />
            手机一键同步
          </a>
        </div>

        <div class="motto" :key="mottoIndex">
          <span class="quote">“</span>
          <span class="motto-zh">{{ motto.zh }}</span>
          <span class="motto-en">{{ motto.en }}</span>
        </div>
      </div>

      <aside class="hero-card">
        <div class="card-glow" />
        <div class="avatar-ring">
          <img :src="withBase(profile.avatar)" :alt="profile.name" loading="eager" />
        </div>
        <h2>{{ profile.name }}</h2>
        <p class="role">{{ profile.role }} · {{ profile.location }}</p>

        <div class="stats">
          <div>
            <strong>{{ posts.length }}</strong>
            <span>文章</span>
          </div>
          <div>
            <strong>{{ notesData.length }}</strong>
            <span>笔记</span>
          </div>
          <div>
            <strong>{{ categories.length }}</strong>
            <span>分类</span>
          </div>
          <div>
            <strong>{{ years }}</strong>
            <span>年</span>
          </div>
        </div>

        <div class="card-links">
          <a :href="profile.github" target="_blank" rel="noreferrer">GitHub ↗</a>
          <a :href="withBase('/timeline/')">时间线</a>
          <a :href="withBase('/styles/')">换样式</a>
        </div>
      </aside>
    </div>

    <div class="scroll-hint" aria-hidden="true">
      <span />
      SCROLL
    </div>
  </section>

  <section class="section page">
    <div class="section-head">
      <div>
        <span class="section-kicker">Latest writing</span>
        <h2 class="section-title">最近在写</h2>
      </div>
      <a class="section-more" :href="withBase('/posts/')">全部文章 →</a>
    </div>

    <div class="post-grid">
      <a
        v-for="(post, index) in latest"
        :key="post.url"
        class="post-card"
        :class="{ 'is-featured': index === 0 }"
        :href="withBase(post.url)"
      >
        <div
          class="cover"
          :style="post.cover ? { backgroundImage: `url(${withBase(post.cover)})` } : {}"
        >
          <span class="cat-badge">{{ post.category }}</span>
          <div v-if="!post.cover" class="cover-art">
            <span class="cover-no">NO.{{ String(index + 1).padStart(2, "0") }}</span>
            <span class="cover-glyph">{{ post.title.slice(0, 1) }}</span>
            <span class="cover-rule" />
          </div>
        </div>
        <div class="card-body">
          <h3>{{ post.title }}</h3>
          <p>{{ post.excerpt }}</p>
          <div class="card-meta">
            <span>{{ post.date }}</span>
            <span class="reading">{{ post.readingTime }} min</span>
          </div>
        </div>
      </a>
    </div>
  </section>

  <section class="section page split">
    <div class="categories">
      <span class="section-kicker">Browse by category</span>
      <h2 class="section-title">按分类浏览</h2>
      <div class="cat-list">
        <a
          v-for="category in categoryStats"
          :key="category.name"
          class="cat-row"
          :href="`${withBase('/posts/')}?category=${encodeURIComponent(category.name)}`"
        >
          <span class="cat-icon">{{ category.icon }}</span>
          <span class="cat-copy">
            <strong>{{ category.name }}</strong>
            <small>{{ category.description }}</small>
          </span>
          <span class="cat-count">{{ category.count }}</span>
        </a>
      </div>
    </div>

    <div class="side">
      <div class="sync-card">
        <span class="section-kicker">Phone → PC</span>
        <h3>手机上写，电脑上收。</h3>
        <p>同一局域网，一个按钮把手机笔记同步到电脑，自动提交并部署到 GitHub Pages。</p>
        <a class="btn btn--primary btn--sm" :href="withBase('/sync/')">看看怎么用</a>
        <span class="sync-note">需要电脑端服务运行中</span>
      </div>

      <div class="note-card">
        <span class="section-kicker">Notes</span>
        <h3>最近笔记</h3>
        <a v-for="note in notes" :key="note.url" :href="withBase(note.url)">
          <span>{{ note.title }}</span>
          <span class="arrow">↗</span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  padding: clamp(40px, 7vh, 88px) 0 clamp(28px, 4vh, 52px);
  overflow: hidden;
}

.hero-inner {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
  gap: clamp(32px, 5vw, 72px);
  align-items: center;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  color: var(--muted);
  text-transform: uppercase;
  margin-bottom: 26px;
}

.pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px rgba(125, 211, 252, 0.12);
  animation: pulse 2.4s infinite;
}

@keyframes pulse {
  50% {
    box-shadow: 0 0 0 8px rgba(125, 211, 252, 0);
  }
}

.hero-title {
  font-size: clamp(38px, 6.4vw, 74px);
  line-height: 1.06;
  letter-spacing: -0.035em;
  font-weight: 800;
}

.gradient {
  background: linear-gradient(100deg, var(--accent) 10%, var(--accent-2) 90%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.dot {
  color: var(--accent);
}

.hero-sub {
  display: inline-block;
  margin-top: 4px;
  font-size: 0.52em;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--muted);
}

.lead {
  margin-top: 26px;
  max-width: 30em;
  color: var(--muted);
  font-size: clamp(15px, 1.5vw, 17px);
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 34px;
}

.dot-live {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}

.motto {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 44px;
  padding-left: 16px;
  border-left: 1px solid var(--border-strong);
  animation: fade-up 0.8s var(--ease) both;
}

.quote {
  display: none;
}

.motto-zh {
  font-size: 14px;
  color: var(--fg-2);
}

.motto-en {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.03em;
  color: var(--muted);
  opacity: 0.8;
}

/* card */
.hero-card {
  position: relative;
  padding: 34px 30px 28px;
  border-radius: 26px;
  border: 1px solid var(--border-strong);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.035));
  backdrop-filter: blur(22px) saturate(1.2);
  -webkit-backdrop-filter: blur(22px) saturate(1.2);
  box-shadow: var(--shadow);
  text-align: center;
  animation: fade-up 0.9s 0.1s var(--ease) both;
}

.card-glow {
  position: absolute;
  inset: -40% -20% auto;
  height: 70%;
  background: radial-gradient(50% 60% at 50% 50%, rgba(125, 211, 252, 0.22), transparent 70%);
  filter: blur(20px);
  pointer-events: none;
}

.avatar-ring {
  width: 104px;
  height: 104px;
  margin: 0 auto 16px;
  padding: 3px;
  border-radius: 50%;
  background: linear-gradient(140deg, var(--accent), var(--accent-2));
  box-shadow: 0 12px 34px rgba(125, 211, 252, 0.24);
}

.avatar-ring img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid var(--bg);
}

.hero-card h2 {
  font-size: 22px;
  letter-spacing: -0.01em;
}

.role {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin: 24px 0;
  padding: 16px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.stats strong {
  display: block;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.stats span {
  font-size: 10.5px;
  color: var(--muted);
  letter-spacing: 0.1em;
}

.card-links {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 12px;
  color: var(--muted);
}

.card-links a:hover {
  color: var(--accent);
}

.scroll-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 26px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.34em;
  color: var(--muted);
  opacity: 0.7;
}

.scroll-hint span {
  width: 1px;
  height: 26px;
  background: linear-gradient(var(--accent), transparent);
}

/* sections */
.section {
  padding: 52px 0 8px;
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.post-card {
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  overflow: hidden;
  transition: transform 0.35s var(--ease), border-color 0.35s var(--ease),
    box-shadow 0.35s var(--ease);
}

.post-card:hover {
  transform: translateY(-4px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.cover {
  position: relative;
  aspect-ratio: 16 / 9;
  background-size: cover;
  background-position: center;
  background-color: var(--surface-2);
  background-image: linear-gradient(135deg, rgba(125, 211, 252, 0.16), rgba(167, 139, 250, 0.1));
}

.cover-art {
  position: absolute;
  inset: 0;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  overflow: hidden;
}

.cover-no {
  position: absolute;
  top: 14px;
  right: 16px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.32);
}

.cover-glyph {
  font-family: var(--font-display);
  font-size: 74px;
  font-weight: 800;
  line-height: 0.82;
  color: rgba(255, 255, 255, 0.2);
  letter-spacing: -0.04em;
  text-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}

.cover-rule {
  width: 44px;
  height: 1px;
  background: linear-gradient(90deg, var(--accent), transparent);
}

.cat-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--fg);
  background: rgba(6, 10, 18, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(10px);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 18px 16px;
  flex: 1;
}

.card-body h3 {
  font-size: 17px;
  line-height: 1.4;
  letter-spacing: -0.01em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-body p {
  font-size: 13px;
  line-height: 1.65;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 12px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--muted);
  letter-spacing: 0.05em;
}

/* split */
.split {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: clamp(28px, 4vw, 56px);
  padding-bottom: 24px;
}

.cat-list {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cat-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 4px;
  border-bottom: 1px solid var(--border);
  transition: padding 0.25s var(--ease), border-color 0.25s var(--ease);
}

.cat-row:hover {
  padding-left: 10px;
  border-color: var(--border-strong);
}

.cat-icon {
  font-family: var(--font-mono);
  color: var(--accent);
  font-size: 15px;
  width: 20px;
}

.cat-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.cat-copy strong {
  font-size: 15px;
  font-weight: 600;
}

.cat-copy small {
  color: var(--muted);
  font-size: 12px;
}

.cat-count {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
}

.side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sync-card {
  position: relative;
  padding: 26px;
  border-radius: 20px;
  border: 1px solid var(--border-strong);
  background: linear-gradient(150deg, rgba(125, 211, 252, 0.14), rgba(167, 139, 250, 0.1));
  overflow: hidden;
}

.sync-card h3 {
  font-size: 21px;
  letter-spacing: -0.01em;
  margin: 6px 0 10px;
}

.sync-card p {
  font-size: 13px;
  line-height: 1.7;
  color: var(--fg-2);
  margin-bottom: 18px;
}

.sync-note {
  display: block;
  margin-top: 12px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.note-card {
  padding: 22px 24px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
}

.note-card h3 {
  font-size: 16px;
  margin: 6px 0 12px;
}

.note-card a {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
  color: var(--fg-2);
  border-bottom: 1px dashed var(--border);
}

.note-card a:last-child {
  border-bottom: 0;
}

.note-card a:hover {
  color: var(--accent);
}

.note-card .arrow {
  color: var(--muted);
  font-size: 11px;
}

@media (max-width: 960px) {
  .hero-inner {
    grid-template-columns: minmax(0, 1fr);
  }
  .hero-card {
    max-width: 420px;
    width: 100%;
  }
  .post-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .post-card.is-featured {
    grid-column: span 2;
  }
  .split {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 620px) {
  .post-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .post-card.is-featured {
    grid-column: span 1;
  }
  .hero {
    padding-top: 36px;
  }
  .hero-card {
    padding: 26px 22px;
  }
  .stats strong {
    font-size: 19px;
  }
}
</style>
