<script setup lang="ts">
import { computed, watch } from "vue";
import { useData, useRoute } from "vitepress";
import { nav, profile, styles } from "../../site";
import { useStyle } from "../composables/useStyle";
import { menuOpen, openSearch, toggleMenu } from "../composables/useUi";

const route = useRoute();
const { site } = useData();
const { style, mode, setStyle, toggleMode } = useStyle();

const currentPath = computed(() => route.path);
const isActive = (link: string) => {
  if (link === "/") return currentPath.value === "/" || currentPath.value === "/index.html";
  return currentPath.value.startsWith(link);
};

const isDark = computed(() => mode.value === "dark");

watch(
  () => route.path,
  () => {
    menuOpen.value = false;
  },
);

const github = profile.github;
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="返回首页">
        <span class="brand-mark">J</span>
        <span class="brand-name">{{ site.title || profile.name }}</span>
      </a>

      <nav class="nav" aria-label="主导航">
        <a
          v-for="item in nav"
          :key="item.link"
          class="nav-link"
          :class="{ 'is-active': isActive(item.link) }"
          :href="item.link"
        >
          {{ item.text }}
        </a>
      </nav>

      <div class="header-actions">
        <div class="style-switch" role="group" aria-label="切换样式">
          <button
            v-for="item in styles"
            :key="item.id"
            type="button"
            :class="{ 'is-active': style === item.id }"
            :title="`${item.name} · ${item.en}`"
            @click="setStyle(item.id)"
          >
            {{ item.name }}
          </button>
        </div>

        <button class="icon-btn" type="button" aria-label="搜索" title="搜索 (Ctrl K)" @click="openSearch">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" stroke-linecap="round" />
          </svg>
        </button>

        <button class="icon-btn" type="button" :aria-label="isDark ? '切换浅色' : '切换深色'" @click="toggleMode">
          <svg v-if="isDark" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke-linecap="round" />
          </svg>
          <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke-linejoin="round" />
          </svg>
        </button>

        <a class="icon-btn" :href="github" target="_blank" rel="noreferrer" aria-label="GitHub">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5a10 10 0 0 0 6.8-9.7C22 6.6 17.5 2 12 2Z" />
          </svg>
        </a>

        <button class="menu-btn" type="button" aria-label="菜单" @click="toggleMenu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
  </header>

  <div v-if="menuOpen" class="mobile-menu">
    <a
      v-for="item in nav"
      :key="item.link"
      :href="item.link"
      :class="{ 'is-active': isActive(item.link) }"
    >
      {{ item.text }}
    </a>
    <div class="mobile-styles">
      <button
        v-for="item in styles"
        :key="item.id"
        type="button"
        :class="{ 'is-active': style === item.id }"
        @click="setStyle(item.id)"
      >
        {{ item.name }}
      </button>
    </div>
    <a :href="github" target="_blank" rel="noreferrer">GitHub ↗</a>
  </div>
</template>

<style scoped>
.mobile-menu a.is-active {
  color: var(--accent);
}

.mobile-styles {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}

.mobile-styles button {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--muted);
  font-size: 13px;
}

.mobile-styles button.is-active {
  color: var(--bg);
  background: var(--accent);
  border-color: var(--accent);
  font-weight: 600;
}
</style>
