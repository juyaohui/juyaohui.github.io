<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import MiniSearch from "minisearch";
import { withBase } from "vitepress";
import { data as postsData } from "../../data/posts.data";
import { data as notesData } from "../../data/notes.data";
import { closeSearch, searchOpen } from "../composables/useUi";

interface Doc {
  id: string;
  title: string;
  url: string;
  meta: string;
  type: string;
  excerpt: string;
  tags: string;
}

const input = ref<HTMLInputElement>();
const query = ref("");
const active = ref(0);
const index = ref<MiniSearch<Doc> | null>(null);

const docs: Doc[] = [
  ...postsData.map((post) => ({
    id: post.url,
    title: post.title,
    url: post.url,
    meta: post.category,
    type: "文章",
    excerpt: post.excerpt,
    tags: post.tags.join(" "),
  })),
  ...notesData.map((note) => ({
    id: note.url,
    title: note.title,
    url: note.url,
    meta: note.group,
    type: "笔记",
    excerpt: "",
    tags: "",
  })),
];

const results = computed(() => {
  const text = query.value.trim();
  if (!text || !index.value) return docs.slice(0, 8);
  return index.value
    .search(text, { prefix: true, fuzzy: 0.2, boost: { title: 3, tags: 1.5 } })
    .slice(0, 10)
    .map((result) => docs.find((doc) => doc.id === result.id)!)
    .filter(Boolean);
});

watch(results, () => {
  active.value = 0;
});

watch(searchOpen, async (open) => {
  if (!open) {
    query.value = "";
    return;
  }
  await nextTick();
  input.value?.focus();
});

function move(delta: number) {
  const length = results.value.length;
  if (!length) return;
  active.value = (active.value + delta + length) % length;
}

function choose(doc: Doc | undefined) {
  if (!doc) return;
  closeSearch();
  window.location.href = withBase(doc.url);
}

function onKeydown(event: KeyboardEvent) {
  if (searchOpen.value) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results.value[active.value]);
    }
    return;
  }
  const target = event.target as HTMLElement | null;
  const typing =
    target?.tagName === "INPUT" ||
    target?.tagName === "TEXTAREA" ||
    target?.isContentEditable;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchOpen.value = true;
  } else if (event.key === "/" && !typing) {
    event.preventDefault();
    searchOpen.value = true;
  }
}

onMounted(() => {
  index.value = new MiniSearch<Doc>({
    fields: ["title", "excerpt", "tags", "meta"],
    storeFields: ["title", "url", "meta", "type"],
    searchOptions: { prefix: true, fuzzy: 0.2 },
  });
  index.value.addAll(docs);
  document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="searchOpen" class="search-overlay" @click.self="closeSearch">
      <div class="search-panel" role="dialog" aria-label="站内搜索">
        <div class="search-input-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--muted)">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" stroke-linecap="round" />
          </svg>
          <input
            ref="input"
            v-model="query"
            type="search"
            placeholder="搜索文章、笔记…"
            spellcheck="false"
            aria-label="搜索关键词"
          />
          <kbd>esc</kbd>
        </div>

        <div class="search-results">
          <template v-if="results.length">
            <button
              v-for="(doc, i) in results"
              :key="doc.id"
              type="button"
              class="search-item"
              :class="{ 'is-active': i === active }"
              @mouseenter="active = i"
              @click="choose(doc)"
            >
              <span class="s-title">{{ doc.title }}</span>
              <span class="s-meta">{{ doc.type }} · {{ doc.meta }}</span>
            </button>
          </template>
          <div v-else class="search-empty">没有找到相关内容，换个关键词试试。</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
