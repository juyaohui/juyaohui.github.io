<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";
import SiteHeader from "./components/SiteHeader.vue";
import SiteFooter from "./components/SiteFooter.vue";
import SearchModal from "./components/SearchModal.vue";
import HomeView from "./components/HomeView.vue";
import PostsView from "./components/PostsView.vue";
import TimelineView from "./components/TimelineView.vue";
import StylesView from "./components/StylesView.vue";
import SyncView from "./components/SyncView.vue";
import DocView from "./components/DocView.vue";
import NotFoundView from "./components/NotFoundView.vue";
import { useStyle } from "./composables/useStyle";

const { frontmatter, page } = useData();
useStyle();

const layout = computed(() => {
  if (page.value.isNotFound) return "notfound";
  const value = frontmatter.value.layout;
  return typeof value === "string" ? value : "doc";
});

const isApp = computed(() => layout.value === "sync");
</script>

<template>
  <div class="app-shell" :data-layout="layout">
    <SiteHeader v-if="!isApp" />
    <main class="app-main">
      <HomeView v-if="layout === 'home'" />
      <PostsView v-else-if="layout === 'posts'" />
      <TimelineView v-else-if="layout === 'timeline'" />
      <StylesView v-else-if="layout === 'styles'" />
      <SyncView v-else-if="layout === 'sync'" />
      <NotFoundView v-else-if="layout === 'notfound'" />
      <DocView v-else>
        <Content />
      </DocView>
    </main>
    <SiteFooter v-if="!isApp" />
    <SearchModal v-if="!isApp" />
  </div>
</template>
