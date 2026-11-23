<script setup lang="ts">
import { computed } from "vue";
import { nav, profile } from "../../site";

const year = new Date().getFullYear();
const buildYear = computed(() => (year > profile.since ? `${profile.since}–${year}` : `${year}`));
</script>

<template>
  <footer class="site-footer">
    <div class="page footer-grid">
      <div class="footer-brand">
        <strong>{{ profile.name }} · {{ profile.role }}</strong>
        <span>{{ profile.tagline }}</span>
        <span style="font-family: var(--font-mono); font-size: 11px">
          EST. {{ profile.since }} · {{ profile.location }}
        </span>
      </div>

      <div class="footer-col">
        <h4>导航</h4>
        <a v-for="item in nav" :key="item.link" :href="item.link">{{ item.text }}</a>
      </div>

      <div class="footer-col">
        <h4>连接</h4>
        <a :href="profile.github" target="_blank" rel="noreferrer">GitHub ↗</a>
        <a href="/styles/">三种样式</a>
        <a href="/sync/">手机同步</a>
        <span>RSS 即将上线</span>
      </div>
    </div>

    <div class="page footer-bottom">
      <span>© {{ buildYear }} {{ profile.name }} · 保留所有权利</span>
      <span>VitePress · TypeScript · pnpm · {{ new Date().getFullYear() }}</span>
    </div>
  </footer>
</template>
