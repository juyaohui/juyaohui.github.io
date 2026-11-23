import { onMounted, ref, watch } from "vue";
import { defaultMode, defaultStyle, type Mode, type StyleId } from "../../site";

const validStyles: StyleId[] = ["aurora", "paper", "mono"];
const isStyle = (value: unknown): value is StyleId =>
  typeof value === "string" && (validStyles as string[]).includes(value);
const isMode = (value: unknown): value is Mode => value === "light" || value === "dark";

const style = ref<StyleId>(defaultStyle);
const mode = ref<Mode>(defaultMode);
let initialized = false;

function apply() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.style = style.value;
  root.dataset.mode = mode.value;
  root.style.colorScheme = mode.value;
  try {
    localStorage.setItem("blog.style", style.value);
    localStorage.setItem("blog.mode", mode.value);
  } catch {
    /* private mode */
  }
}

function initFromEnvironment() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const params = new URLSearchParams(window.location.search);
  const queryStyle = params.get("style");
  const queryMode = params.get("mode");
  let storedStyle: string | null = null;
  let storedMode: string | null = null;
  try {
    storedStyle = localStorage.getItem("blog.style");
    storedMode = localStorage.getItem("blog.mode");
  } catch {
    /* ignore */
  }
  const nextStyle = isStyle(queryStyle)
    ? queryStyle
    : isStyle(storedStyle)
      ? storedStyle
      : defaultStyle;
  const nextMode = isMode(queryMode)
    ? queryMode
    : isMode(storedMode)
      ? storedMode
      : nextStyle === "paper"
        ? "light"
        : defaultMode;
  style.value = nextStyle;
  mode.value = nextMode;
  apply();
}

function setStyle(next: StyleId) {
  style.value = next;
  if (next === "paper" && mode.value === "dark" && !manuallySetMode) {
    mode.value = "light";
  }
  apply();
}

function setMode(next: Mode) {
  mode.value = next;
  manuallySetMode = true;
  apply();
}

function toggleMode() {
  setMode(mode.value === "dark" ? "light" : "dark");
}

let manuallySetMode = false;

watch([style, mode], apply);

export function useStyle() {
  onMounted(initFromEnvironment);
  return { style, mode, setStyle, setMode, toggleMode, styles: validStyles };
}
