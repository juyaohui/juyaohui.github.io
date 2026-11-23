<script setup lang="ts">
import { ref } from "vue";
import { withBase } from "vitepress";
import { styles } from "../../site";
import { useStyle } from "../composables/useStyle";

const { style, setStyle } = useStyle();
const toast = ref("");

function choose(id: (typeof styles)[number]["id"]) {
  setStyle(id);
  const meta = styles.find((item) => item.id === id);
  toast.value = `已将「${meta?.name ?? id}」设为当前样式`;
  window.setTimeout(() => (toast.value = ""), 2400);
}

const preview = (id: string) => {
  const meta = styles.find((item) => item.id === id);
  return `${withBase("/")}?style=${id}&mode=${meta?.defaultMode ?? "dark"}&preview=1`;
};
</script>

<template>
  <div class="styles-page page">
    <header class="page-head">
      <span class="section-kicker">Look &amp; feel</span>
      <h1>三种样子，同一份内容</h1>
      <p>
        重构后做了三套视觉方向：极光、纸墨、终端。它们共用同一套页面结构、文章和笔记，
        点下面的按钮即可实时切换整站样式；选好后告诉我，我会把它设为默认并重新部署。
      </p>
    </header>

    <div class="style-grid">
      <article
        v-for="item in styles"
        :key="item.id"
        class="style-card"
        :class="{ 'is-current': style === item.id }"
      >
        <div class="preview">
          <iframe
            :src="preview(item.id)"
            :title="`${item.name} 样式预览`"
            loading="lazy"
            tabindex="-1"
            aria-hidden="true"
          />
          <span v-if="style === item.id" class="current-badge">当前使用</span>
        </div>

        <div class="style-body">
          <div class="style-title-row">
            <h2>{{ item.name }}</h2>
            <span class="style-en">{{ item.en }}</span>
            <span class="swatches">
              <i v-for="color in item.swatch" :key="color" :style="{ background: color }" />
            </span>
          </div>

          <p class="style-tagline">{{ item.tagline }}</p>
          <p class="style-desc">{{ item.description }}</p>

          <div class="keywords">
            <span v-for="word in item.keywords" :key="word">{{ word }}</span>
          </div>

          <div class="style-actions">
            <button
              type="button"
              class="btn btn--primary btn--sm"
              :disabled="style === item.id"
              @click="choose(item.id)"
            >
              {{ style === item.id ? "正在使用" : "使用这个样式" }}
            </button>
            <a class="btn btn--ghost btn--sm" :href="preview(item.id)" target="_blank" rel="noreferrer">
              全屏预览 ↗
            </a>
          </div>
        </div>
      </article>
    </div>

    <section class="notes">
      <h2>关于这次重设计</h2>
      <div class="note-grid">
        <div>
          <h3>为什么要重做</h3>
          <p>
            旧站基于 VuePress 1.x + reco 主题，插件多、自定义样式层层覆盖，改一处经常崩一片。
            新版把内容与表现拆开：文章只是 Markdown，样式是独立的三套 token，互不干扰。
          </p>
        </div>
        <div>
          <h3>保留了哪些</h3>
          <p>
            全部 16 篇文章、12 篇笔记、分类、标签、图片和头像都迁移了过来；时间线、搜索、
            分类筛选重新实现，加载更快，手机上也能正常阅读。
          </p>
        </div>
        <div>
          <h3>技术上有什么变化</h3>
          <p>
            pnpm monorepo + VitePress + TypeScript，Vite 构建、原生本地搜索（无需服务）。
            另外加了一个局域网同步服务，手机一键把笔记写回电脑并自动发布。
          </p>
        </div>
      </div>
    </section>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.styles-page {
  padding-bottom: 40px;
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 8px;
}

.style-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
  transition: border-color 0.25s var(--ease), transform 0.25s var(--ease);
}

.style-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-strong);
}

.style-card.is-current {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.preview {
  position: relative;
  height: 238px;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
  background: #0a0d12;
}

.preview iframe {
  width: 1200px;
  height: 820px;
  border: 0;
  transform: scale(0.29);
  transform-origin: top left;
  pointer-events: none;
}

.current-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--bg);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.style-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 18px 20px;
  flex: 1;
}

.style-title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.style-title-row h2 {
  font-size: 20px;
  letter-spacing: -0.01em;
}

.style-en {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

.swatches {
  display: inline-flex;
  gap: 4px;
  margin-left: auto;
}

.swatches i {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.28);
}

.style-tagline {
  font-size: 13px;
  color: var(--accent);
}

.style-desc {
  font-size: 13px;
  line-height: 1.75;
  color: var(--muted);
  flex: 1;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.keywords span {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 3px 7px;
  border: 1px solid var(--border);
  color: var(--muted);
}

.style-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.notes {
  margin-top: 64px;
  padding-top: 36px;
  border-top: 1px solid var(--border);
}

.notes > h2 {
  font-size: 26px;
  margin-bottom: 24px;
}

.note-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
}

.note-grid h3 {
  font-size: 15px;
  margin-bottom: 8px;
}

.note-grid p {
  font-size: 13px;
  line-height: 1.8;
  color: var(--muted);
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 80;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: var(--bg-soft);
  color: var(--fg);
  font-size: 13px;
  box-shadow: var(--shadow);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s var(--ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

@media (max-width: 980px) {
  .style-grid,
  .note-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .style-grid,
  .note-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
