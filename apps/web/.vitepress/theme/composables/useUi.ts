import { ref } from "vue";

/** Shared, tiny UI state (search palette + mobile nav). */
export const searchOpen = ref(false);
export const menuOpen = ref(false);

export function openSearch() {
  searchOpen.value = true;
  menuOpen.value = false;
}

export function closeSearch() {
  searchOpen.value = false;
}

export function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}
