import type { Theme } from "vitepress";
import Layout from "./Layout.vue";
import "./styles/base.css";
import "./styles/aurora.css";
import "./styles/paper.css";
import "./styles/mono.css";

export default {
  Layout,
} satisfies Theme;
