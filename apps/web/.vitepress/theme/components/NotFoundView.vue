<script setup lang="ts">
import { withBase } from "vitepress";
</script>

<template>
  <div class="notfound page">
    <div class="code" aria-hidden="true">404</div>
    <h1>这条路径不存在</h1>
    <p>可能是链接写错了，或者这篇文章已经被搬走。试试从下面重新出发。</p>
    <div class="actions">
      <a class="btn btn--primary" :href="withBase('/')">回到首页</a>
      <a class="btn btn--ghost" :href="withBase('/posts/')">全部文章</a>
      <a class="btn btn--ghost" :href="withBase('/notes/')">笔记</a>
    </div>
  </div>
</template>

<style scoped>
.notfound {
  min-height: 62vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 14px;
  padding: 80px 0;
}

.code {
  font-family: var(--font-mono);
  font-size: clamp(80px, 18vw, 180px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.06em;
  color: transparent;
  -webkit-text-stroke: 1px var(--border-strong);
}

h1 {
  font-size: clamp(24px, 4vw, 34px);
  letter-spacing: -0.02em;
}

p {
  max-width: 32em;
  color: var(--muted);
  font-size: 14px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
}
</style>
