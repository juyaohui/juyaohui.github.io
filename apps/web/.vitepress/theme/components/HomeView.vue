<script setup lang="ts">
import { useStyle } from "../composables/useStyle";
import AuroraHome from "./AuroraHome.vue";
import PaperHome from "./PaperHome.vue";
import MonoHome from "./MonoHome.vue";

const { style } = useStyle();
</script>

<template>
  <AuroraHome v-if="style === 'aurora'" />
  <PaperHome v-else-if="style === 'paper'" />
  <MonoHome v-else />
</template>
