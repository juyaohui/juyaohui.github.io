<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { withBase } from "vitepress";
import {
  SYNC_TARGETS,
  type PairResponse,
  type ServerInfo,
  type SyncItem,
  type SyncProgressEvent,
  type SyncResponse,
  type SyncTarget,
} from "@blog/shared";

type Mode = "checking" | "lan" | "remote";

const mode = ref<Mode>("checking");
const online = ref(false);
const server = ref<ServerInfo | null>(null);
const token = ref("");
const deviceId = ref("");
const code = ref("");
const pairing = ref(false);
const pairError = ref("");
const queue = ref<SyncItem[]>([]);
const syncing = ref(false);
const progress = ref(0);
const phaseText = ref("");
const lastSync = ref<SyncResponse | null>(null);
const toast = ref("");
const history = ref<{ at: string; text: string; ok: boolean }[]>([]);
const manualServer = ref("");
const manualCode = ref("");
const editingId = ref<string | null>(null);
const showAdvanced = ref(false);

const deviceName = ref("手机");

const composer = reactive({
  title: "",
  content: "",
  tags: "",
  target: "essay" as SyncTarget,
});

const pending = computed(() => queue.value.length);
const paired = computed(() => Boolean(token.value));
const statusLabel = computed(() => {
  if (mode.value === "remote") return "公开站点";
  if (!online.value) return "电脑离线";
  return "电脑在线";
});
const progressPercent = computed(() => Math.round(progress.value));
const targets = Object.entries(SYNC_TARGETS).map(([id, value]) => ({
  id: id as SyncTarget,
  label: value.label,
}));

let healthTimer: ReturnType<typeof setInterval> | undefined;
let events: EventSource | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let stopped = false;

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function message(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") return "请求超时";
  return error instanceof Error ? error.message : String(error);
}

function notify(text: string) {
  toast.value = text;
  window.setTimeout(() => {
    if (toast.value === text) toast.value = "";
  }, 3200);
}

function detectDevice(): { name: string; platform: string } {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return { name: "iPhone", platform: "ios" };
  if (/iPad/.test(ua)) return { name: "iPad", platform: "ipados" };
  if (/Android/.test(ua)) return { name: "Android 手机", platform: "android" };
  return { name: "浏览器", platform: "web" };
}

async function request<T>(path: string, init: RequestInit = {}, timeout = 9000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    };
    if (token.value) headers.authorization = `Bearer ${token.value}`;
    const response = await fetch(path, { ...init, headers, signal: controller.signal });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) throw new Error((data.error as string) || `HTTP ${response.status}`);
    return data as T;
  } finally {
    window.clearTimeout(timer);
  }
}

function persist() {
  try {
    if (token.value) localStorage.setItem("sync.token", token.value);
    else localStorage.removeItem("sync.token");
    if (deviceId.value) localStorage.setItem("sync.deviceId", deviceId.value);
    localStorage.setItem("sync.queue", JSON.stringify(queue.value));
    localStorage.setItem("sync.history", JSON.stringify(history.value.slice(0, 8)));
    if (manualServer.value) localStorage.setItem("sync.server", manualServer.value);
  } catch {
    /* private mode */
  }
}

function restore() {
  try {
    token.value = localStorage.getItem("sync.token") ?? "";
    deviceId.value = localStorage.getItem("sync.deviceId") ?? "";
    manualServer.value = localStorage.getItem("sync.server") ?? "";
    const savedQueue = JSON.parse(localStorage.getItem("sync.queue") ?? "[]") as SyncItem[];
    const savedHistory = JSON.parse(localStorage.getItem("sync.history") ?? "[]") as typeof history.value;
    if (Array.isArray(savedQueue)) queue.value = savedQueue;
    if (Array.isArray(savedHistory)) history.value = savedHistory;
  } catch {
    /* ignore */
  }
}

function resetComposer() {
  composer.title = "";
  composer.content = "";
  composer.tags = "";
  composer.target = "essay";
  editingId.value = null;
}

function saveDraft() {
  const title = composer.title.trim() || "无标题笔记";
  const content = composer.content.trim();
  if (!content && !composer.title.trim()) {
    notify("先写点内容再保存");
    return;
  }
  const tags = composer.tags
    .split(/[,，\s#]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
  const now = new Date().toISOString();

  if (editingId.value) {
    const item = queue.value.find((entry) => entry.id === editingId.value);
    if (item) {
      item.title = title;
      item.content = content;
      item.tags = tags;
      item.target = composer.target;
      item.updatedAt = now;
    }
    notify("已更新待同步内容");
  } else {
    queue.value.unshift({
      id: uid(),
      title,
      content,
      tags,
      target: composer.target,
      createdAt: now,
      updatedAt: now,
    });
    notify("已加入待同步");
  }
  resetComposer();
}

function editDraft(item: SyncItem) {
  editingId.value = item.id;
  composer.title = item.title;
  composer.content = item.content;
  composer.tags = item.tags.join(", ");
  composer.target = item.target;
  window.scrollTo({ top: 260, behavior: "smooth" });
}

function removeDraft(id: string) {
  queue.value = queue.value.filter((item) => item.id !== id);
  if (editingId.value === id) resetComposer();
}

function clearQueue() {
  if (!pending.value) return;
  queue.value = [];
  resetComposer();
  notify("已清空待同步列表");
}

async function pair(codeValue = code.value) {
  const trimmed = codeValue.trim();
  if (!/^\d{4,8}$/.test(trimmed)) {
    pairError.value = "请输入 6 位数字配对码";
    return;
  }
  pairing.value = true;
  pairError.value = "";
  try {
    const result = await request<PairResponse>("/api/pair", {
      method: "POST",
      body: JSON.stringify({ code: trimmed, device: detectDevice() }),
    });
    token.value = result.token;
    deviceId.value = result.device.id;
    server.value = result.server;
    online.value = true;
    persist();
    connectEvents();
    notify("配对成功，可以同步了");
  } catch (error) {
    pairError.value = message(error);
  } finally {
    pairing.value = false;
  }
}

async function refreshInfo() {
  try {
    const info = await request<ServerInfo>("/api/info", {}, 5000);
    server.value = info;
    online.value = true;
  } catch {
    online.value = false;
  }
}

const phasePercent: Record<string, number> = {
  queued: 2,
  received: 12,
  writing: 45,
  committing: 72,
  pushing: 88,
  done: 100,
  error: 100,
};

function connectEvents() {
  if (!token.value || mode.value !== "lan") return;
  events?.close();
  try {
    events = new EventSource(`/api/events?token=${encodeURIComponent(token.value)}`);
    events.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SyncProgressEvent;
        phaseText.value = data.message;
        const next = phasePercent[data.phase] ?? progress.value;
        progress.value = Math.max(progress.value, next);
      } catch {
        /* ignore malformed frame */
      }
    };
    events.onerror = () => {
      events?.close();
      if (stopped) return;
      reconnectTimer = window.setTimeout(connectEvents, 5000);
    };
  } catch {
    /* EventSource unsupported */
  }
}

async function syncNow() {
  if (syncing.value) return;
  if (mode.value === "remote") {
    notify("请先在局域网版页面打开");
    return;
  }
  if (!online.value) {
    notify("电脑离线，稍后再试");
    return;
  }
  if (!paired.value) {
    notify("请先输入配对码");
    return;
  }
  syncing.value = true;
  progress.value = 3;
  phaseText.value = "正在连接电脑…";
  try {
    const result = await request<SyncResponse>(
      "/api/sync",
      {
        method: "POST",
        body: JSON.stringify({
          deviceId: deviceId.value,
          clientTime: new Date().toISOString(),
          items: queue.value,
        }),
      },
      120000,
    );
    lastSync.value = result;
    const written = result.files.filter(
      (file) => file.status === "created" || file.status === "updated" || file.status === "conflict",
    ).length;
    queue.value = queue.value.filter((item, index) => result.files[index]?.status === "rejected");
    progress.value = 100;
    phaseText.value = result.commit
      ? result.commit.pushed
        ? `已推送到 GitHub · ${result.commit.sha}`
        : `已提交到本地 · ${result.commit.sha}`
      : written
        ? `已写入 ${written} 条笔记（git 未提交）`
        : "没有需要同步的内容";
    history.value.unshift({ at: new Date().toISOString(), text: phaseText.value, ok: true });
    notify(result.commit?.pushed ? "同步完成，GitHub 正在部署" : "同步完成");
    if (result.commit) void refreshInfo();
  } catch (error) {
    const text = message(error);
    phaseText.value = text;
    history.value.unshift({ at: new Date().toISOString(), text, ok: false });
    notify(`同步失败：${text}`);
    if (text.includes("令牌") || text.includes("配对")) {
      token.value = "";
      deviceId.value = "";
      persist();
    }
  } finally {
    window.setTimeout(() => {
      syncing.value = false;
      if (progress.value >= 100) {
        window.setTimeout(() => {
          if (!syncing.value) progress.value = 0;
        }, 1600);
      }
    }, 500);
  }
}

function openLanApp() {
  const raw = manualServer.value.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!raw) {
    notify("请输入电脑端的地址，例如 192.168.1.2:5178");
    return;
  }
  const withPort = /:\d+$/.test(raw) ? raw : `${raw}:5178`;
  const url = `http://${withPort}/sync/${manualCode.value ? `?code=${encodeURIComponent(manualCode.value)}` : ""}`;
  try {
    localStorage.setItem("sync.server", manualServer.value);
  } catch {
    /* ignore */
  }
  window.location.href = url;
}

async function boot() {
  restore();
  const device = detectDevice();
  deviceName.value = device.name;

  const params = new URLSearchParams(window.location.search);
  const queryCode = params.get("code");
  if (queryCode) code.value = queryCode;

  const reachable = await fetch("/api/health", { signal: AbortSignal.timeout(3000) })
    .then((response) => response.ok)
    .catch(() => false);

  if (!reachable) {
    mode.value = "remote";
    return;
  }

  mode.value = "lan";
  await refreshInfo();

  if (queryCode && !paired.value) {
    await pair(queryCode);
  }
  if (paired.value) {
    connectEvents();
  }

  healthTimer = window.setInterval(async () => {
    if (stopped) return;
    try {
      await request("/api/health", {}, 4000);
      if (!online.value) await refreshInfo();
      online.value = true;
    } catch {
      online.value = false;
    }
  }, 15000);
}

onMounted(boot);

onBeforeUnmount(() => {
  stopped = true;
  if (healthTimer) window.clearInterval(healthTimer);
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  events?.close();
});

watch(queue, persist, { deep: true });
watch(history, persist, { deep: true });
watch([manualServer, manualCode], persist);
</script>

<template>
  <div class="sync-app">
    <header class="sync-top">
      <a class="back" :href="withBase('/')">← 博客</a>
      <span class="top-brand">SYNC · {{ server?.name ?? "手机同步" }}</span>
      <span class="top-status" :class="{ offline: !online && mode === 'lan' }">
        {{ statusLabel }}
      </span>
    </header>

    <main class="sync-main">
      <section v-if="mode === 'checking'" class="loading">
        <span class="spinner" />
        正在检查电脑端服务…
      </section>

      <template v-else-if="mode === 'remote'">
        <section class="card intro">
          <span class="eyebrow">ONE-TAP SYNC</span>
          <h1>手机写，电脑收。</h1>
          <p>
            这是部署在 GitHub Pages 上的公开站点。浏览器不允许 HTTPS 页面直接访问你电脑上的
            HTTP 服务，所以同步面板需要在局域网版里打开——数据只在你的手机和电脑之间流动。
          </p>
          <div class="steps">
            <div class="step"><b>01</b><span>电脑上运行 <code>pnpm sync</code></span></div>
            <div class="step"><b>02</b><span>记下电脑显示的地址和 6 位配对码</span></div>
            <div class="step"><b>03</b><span>在下面打开局域网面板，写笔记，一键同步</span></div>
          </div>
        </section>

        <section class="card">
          <h2>打开局域网同步面板</h2>
          <label class="field">
            <span>电脑地址</span>
            <input v-model="manualServer" placeholder="192.168.1.2 或 192.168.1.2:5178" inputmode="url" />
          </label>
          <label class="field">
            <span>配对码（可选，扫码进入会自动填）</span>
            <input v-model="manualCode" placeholder="6 位数字" inputmode="numeric" maxlength="6" />
          </label>
          <button class="btn-primary" type="button" @click="openLanApp">打开同步面板 →</button>
          <p class="hint">
            手机和电脑需要连接同一个 Wi-Fi。也可以直接用手机相机扫描电脑终端里的二维码。
          </p>
        </section>

        <section class="card app-card">
          <span class="eyebrow">ANDROID APP</span>
          <h2>装一个「随记」App</h2>
          <p>
            本地写笔记、离线保存，App 内扫码配对，打开电脑时一键同步。
            下载 APK 直接安装，数据只存在手机和你的电脑上。
          </p>
          <a class="download-btn" :href="withBase('/downloads/suiji-1.0.apk')" download>
            下载随记 APK · 约 614 KB
          </a>
        </section>

        <section class="card muted-card">
          <h2>为什么不在公开站点直接同步？</h2>
          <p>
            浏览器出于安全考虑会拦截 HTTPS 页面访问局域网 HTTP 接口。把同步面板放在电脑上的
            服务里，既避免了混用内容，也不需要把配对码或令牌暴露到公网。
          </p>
        </section>
      </template>

      <template v-else>
        <section v-if="!paired" class="card pair-card">
          <span class="eyebrow">PAIR DEVICE</span>
          <h1>和电脑配对</h1>
          <p>输入电脑终端里显示的 6 位配对码。配对一次后，这台手机会记住令牌。</p>
          <div class="pair-row">
            <input
              v-model="code"
              class="code-input"
              inputmode="numeric"
              maxlength="6"
              placeholder="000000"
              @keyup.enter="pair()"
            />
            <button class="btn-primary" type="button" :disabled="pairing" @click="pair()">
              {{ pairing ? "配对中…" : "配对" }}
            </button>
          </div>
          <p v-if="pairError" class="error">{{ pairError }}</p>
          <p class="hint">配对码 10 分钟内有效，每次重启服务会刷新。</p>
        </section>

        <template v-else>
          <section class="sync-hero">
            <div class="hero-head">
              <span class="device">{{ deviceName }}</span>
              <span class="online" :class="{ off: !online }">
                <i />
                {{ online ? "电脑在线" : "电脑离线" }}
              </span>
            </div>

            <button
              class="orb"
              type="button"
              :class="{
                'is-syncing': syncing,
                'is-offline': !online,
                'has-progress': progress > 0,
              }"
              :style="{ '--p': progressPercent }"
              :disabled="syncing || !online"
              @click="syncNow"
            >
              <span class="orb-ring" />
              <span class="orb-content">
                <strong>{{ syncing ? `${progressPercent}%` : "一键同步" }}</strong>
                <small>{{ pending ? `待同步 ${pending} 条` : online ? "同步到电脑" : "等待电脑" }}</small>
              </span>
            </button>

            <p class="phase">{{ phaseText || (online ? "写点东西，然后按一下" : "电脑端服务未运行") }}</p>

            <div class="hero-meta">
              <span v-if="server?.lastCommit">最近提交 {{ server.lastCommit.sha }}</span>
              <span v-if="server?.lastSyncAt">· {{ new Date(server.lastSyncAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) }}</span>
              <a v-if="server?.siteUrl" :href="server.siteUrl" target="_blank" rel="noreferrer">公开主页 ↗</a>
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <h2>{{ editingId ? "编辑笔记" : "快速记录" }}</h2>
              <span class="count">{{ composer.content.length }} 字</span>
            </div>
            <input v-model="composer.title" class="title-input" placeholder="标题（可以留空）" maxlength="120" />
            <textarea
              v-model="composer.content"
              class="body-input"
              rows="6"
              placeholder="用 Markdown 随手写点什么…"
            />
            <input v-model="composer.tags" class="tags-input" placeholder="标签，用空格或逗号分隔" />
            <div class="target-row">
              <button
                v-for="target in targets"
                :key="target.id"
                type="button"
                class="target"
                :class="{ active: composer.target === target.id }"
                @click="composer.target = target.id"
              >
                {{ target.label }}
              </button>
              <button class="save-btn" type="button" @click="saveDraft">
                {{ editingId ? "保存修改" : "加入待同步" }}
              </button>
            </div>
          </section>

          <section class="card queue-card">
            <div class="card-head">
              <h2>待同步 <span class="badge">{{ pending }}</span></h2>
              <button v-if="pending" type="button" class="link-btn" @click="clearQueue">清空</button>
            </div>

            <div v-if="!pending" class="empty-queue">
              <p>暂无待同步内容。</p>
              <small>在这里写的笔记会先存在手机上，按「一键同步」后写入电脑。</small>
            </div>

            <ul v-else class="queue-list">
              <li v-for="item in queue" :key="item.id" class="queue-item">
                <div class="q-main">
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.content.replace(/[#*`>\-]/g, "").slice(0, 90) || "（空）" }}</p>
                  <div class="q-meta">
                    <span class="q-target">{{ SYNC_TARGETS[item.target].label }}</span>
                    <span v-for="tag in item.tags" :key="tag">#{{ tag }}</span>
                    <span>{{ new Date(item.updatedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) }}</span>
                  </div>
                </div>
                <div class="q-actions">
                  <button type="button" @click="editDraft(item)">编辑</button>
                  <button type="button" class="danger" @click="removeDraft(item.id)">删除</button>
                </div>
              </li>
            </ul>
          </section>

          <section v-if="history.length" class="card history-card">
            <div class="card-head"><h2>同步记录</h2></div>
            <ul>
              <li v-for="(entry, index) in history.slice(0, 5)" :key="index" :class="{ failed: !entry.ok }">
                <span class="h-time">{{ new Date(entry.at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) }}</span>
                <span class="h-text">{{ entry.text }}</span>
              </li>
            </ul>
          </section>

          <section class="card install-card">
            <h2>当作 App 用</h2>
            <p>
              在手机浏览器菜单里选择「添加到主屏幕」，之后从桌面图标打开就是全屏的同步面板。
              首次进入需要配对，之后会记住这台设备。
            </p>
            <button type="button" class="link-btn" @click="showAdvanced = !showAdvanced">
              {{ showAdvanced ? "收起" : "连接信息 / 解除配对" }}
            </button>
            <div v-if="showAdvanced" class="advanced">
              <p><span>局域网地址</span><code>{{ server?.lanUrls?.[0] ?? "—" }}</code></p>
              <p><span>设备</span><code>{{ deviceName }}</code></p>
              <button
                type="button"
                class="danger-link"
                @click="token = ''; deviceId = ''; persist()"
              >
                解除本机配对
              </button>
            </div>
          </section>
        </template>
      </template>
    </main>

    <Transition name="toast">
      <div v-if="toast" class="sync-toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.sync-app {
  --s-bg: #06090f;
  --s-card: #0b1119;
  --s-card-2: #0e1620;
  --s-line: #1c2634;
  --s-fg: #e7eef8;
  --s-muted: #7f8da1;
  --s-accent: #7dd3fc;
  --s-accent-2: #b6f36b;
  --s-danger: #fb7185;
  min-height: 100dvh;
  background:
    radial-gradient(60% 40% at 80% 0%, rgba(125, 211, 252, 0.12), transparent 70%),
    radial-gradient(50% 35% at 10% 10%, rgba(182, 243, 107, 0.07), transparent 70%),
    var(--s-bg);
  color: var(--s-fg);
  padding-bottom: env(safe-area-inset-bottom);
}

.sync-top {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  padding-top: env(safe-area-inset-top);
  background: rgba(6, 9, 15, 0.78);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--s-line);
  font-family: var(--font-mono);
  font-size: 11px;
}

.back {
  color: #9fb0c3;
  letter-spacing: 0.06em;
}

.back:hover {
  color: var(--s-accent);
}

.top-brand {
  flex: 1;
  text-align: center;
  letter-spacing: 0.18em;
  color: var(--s-fg);
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--s-accent-2);
  font-size: 10px;
  letter-spacing: 0.08em;
}

.top-status::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.top-status.offline {
  color: var(--s-muted);
}

.sync-main {
  width: min(560px, 100% - 28px);
  margin: 0 auto;
  padding: 20px 0 80px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.loading {
  min-height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--s-muted);
  font-family: var(--font-mono);
  font-size: 12px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--s-line);
  border-top-color: var(--s-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.card {
  background: var(--s-card);
  border: 1px solid var(--s-line);
  border-radius: 18px;
  padding: 20px;
}

.eyebrow {
  display: block;
  margin-bottom: 10px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.28em;
  color: var(--s-accent);
  text-transform: uppercase;
}

.card h1 {
  font-size: 26px;
  letter-spacing: -0.02em;
  margin-bottom: 10px;
}

.card h2 {
  font-size: 15px;
  letter-spacing: -0.01em;
}

.card p {
  font-size: 13px;
  line-height: 1.75;
  color: var(--s-muted);
}

.intro .steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.step {
  display: flex;
  gap: 10px;
  align-items: baseline;
  font-size: 12.5px;
  color: #b9c5d4;
}

.step b {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--s-accent-2);
  font-weight: 500;
}

.step code {
  font-size: 11.5px;
  background: var(--s-card-2);
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--s-accent);
}

.field {
  display: block;
  margin: 16px 0;
}

.field span {
  display: block;
  margin-bottom: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--s-muted);
  text-transform: uppercase;
}

.field input,
.title-input,
.body-input,
.tags-input,
.code-input {
  width: 100%;
  border: 1px solid var(--s-line);
  background: var(--s-bg);
  color: var(--s-fg);
  border-radius: 10px;
  padding: 11px 13px;
  font: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.field input:focus,
.title-input:focus,
.body-input:focus,
.tags-input:focus,
.code-input:focus {
  border-color: var(--s-accent);
}

.btn-primary {
  width: 100%;
  margin-top: 4px;
  padding: 13px;
  border-radius: 12px;
  background: var(--s-accent);
  color: #041018;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.02em;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.hint {
  margin-top: 10px;
  font-size: 11.5px !important;
  color: #64748b !important;
}

.muted-card {
  background: transparent;
  border-style: dashed;
}

.app-card {
  background: linear-gradient(150deg, rgba(182, 243, 107, 0.1), rgba(125, 211, 252, 0.06)), var(--s-card);
}

.download-btn {
  display: block;
  margin-top: 16px;
  padding: 13px;
  border-radius: 12px;
  background: var(--s-accent-2);
  color: #07100a;
  text-align: center;
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
}

.download-btn:hover {
  filter: brightness(1.05);
}

/* pairing */
.pair-card .pair-row {
  display: flex;
  gap: 10px;
  margin: 18px 0 8px;
}

.code-input {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 24px;
  letter-spacing: 0.4em;
  text-align: center;
  padding: 12px;
}

.pair-row .btn-primary {
  width: auto;
  margin: 0;
  padding-inline: 22px;
  white-space: nowrap;
}

.error {
  color: var(--s-danger) !important;
  font-size: 12px !important;
}

/* hero */
.sync-hero {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--s-line);
  border-radius: 22px;
  background:
    radial-gradient(70% 60% at 50% 0%, rgba(125, 211, 252, 0.14), transparent 70%),
    var(--s-card);
  padding: 20px 20px 18px;
  text-align: center;
}

.hero-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: var(--s-muted);
}

.online {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--s-accent-2);
}

.online i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.online.off {
  color: var(--s-danger);
}

.orb {
  position: relative;
  width: 178px;
  height: 178px;
  margin: 22px auto 14px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--s-bg);
  isolation: isolate;
}

.orb-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    var(--s-accent-2) calc(var(--p) * 1%),
    rgba(255, 255, 255, 0.07) 0
  );
  mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
  transition: background 0.4s linear, opacity 0.3s ease;
  opacity: 0;
}

.orb.has-progress .orb-ring {
  opacity: 1;
}

.orb::before {
  content: "";
  position: absolute;
  inset: 9px;
  border-radius: 50%;
  background: radial-gradient(60% 60% at 50% 35%, rgba(125, 211, 252, 0.16), transparent 70%),
    var(--s-card-2);
  border: 1px solid var(--s-line);
}

.orb-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.orb-content strong {
  font-size: 25px;
  letter-spacing: -0.02em;
}

.orb-content small {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.12em;
  color: var(--s-muted);
}

.orb.is-syncing {
  cursor: progress;
}

.orb.is-syncing::after {
  content: "";
  position: absolute;
  inset: 9px;
  border-radius: 50%;
  border: 1px solid transparent;
  border-top-color: var(--s-accent);
  animation: spin 1s linear infinite;
}

.orb:disabled {
  opacity: 0.62;
}

.phase {
  min-height: 20px;
  font-size: 12px !important;
  color: #aebdcf !important;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: #5f6f82;
}

.hero-meta a {
  color: var(--s-accent);
}

/* composer */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--s-muted);
}

.title-input {
  margin-bottom: 8px;
  font-weight: 600;
}

.body-input {
  resize: vertical;
  min-height: 120px;
  line-height: 1.7;
  font-size: 13.5px;
}

.tags-input {
  margin-top: 8px;
  font-size: 12.5px;
}

.target-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.target {
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--s-line);
  color: var(--s-muted);
  font-size: 12px;
}

.target.active {
  border-color: var(--s-accent);
  color: var(--s-accent);
  background: rgba(125, 211, 252, 0.08);
}

.save-btn {
  margin-left: auto;
  padding: 9px 16px;
  border-radius: 10px;
  background: var(--s-fg);
  color: var(--s-bg);
  font-size: 12.5px;
  font-weight: 700;
}

/* queue */
.badge {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  margin-left: 4px;
  border-radius: 999px;
  background: var(--s-accent-2);
  color: #07100a;
  font-size: 10px;
  font-family: var(--font-mono);
  vertical-align: 2px;
}

.link-btn {
  font-size: 11.5px;
  color: var(--s-muted);
  border-bottom: 1px solid var(--s-line);
}

.link-btn:hover {
  color: var(--s-accent);
}

.empty-queue {
  padding: 18px 0 8px;
  text-align: center;
}

.empty-queue p {
  color: #aebdcf;
}

.empty-queue small {
  display: block;
  margin-top: 6px;
  font-size: 11.5px;
  color: #64748b;
}

.queue-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.queue-item {
  display: flex;
  gap: 12px;
  padding: 13px;
  border: 1px solid var(--s-line);
  border-radius: 12px;
  background: var(--s-card-2);
}

.q-main {
  flex: 1;
  min-width: 0;
}

.q-main h3 {
  font-size: 13.5px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.q-main p {
  font-size: 11.5px;
  color: var(--s-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.q-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 7px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: #5f6f82;
}

.q-target {
  color: var(--s-accent);
}

.q-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11px;
  color: var(--s-muted);
}

.q-actions button:hover {
  color: var(--s-accent);
}

.q-actions .danger:hover {
  color: var(--s-danger);
}

/* history */
.history-card ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-card li {
  display: flex;
  gap: 10px;
  font-size: 11.5px;
  color: var(--s-muted);
}

.h-time {
  font-family: var(--font-mono);
  font-size: 9.5px;
  flex-shrink: 0;
  opacity: 0.8;
}

.history-card li.failed .h-text {
  color: var(--s-danger);
}

.install-card p {
  margin: 8px 0 10px;
}

.advanced {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--s-line);
}

.advanced p {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 11.5px;
}

.advanced code {
  font-family: var(--font-mono);
  font-size: 11px;
  color: #b9c5d4;
}

.danger-link {
  margin-top: 10px;
  font-size: 11.5px;
  color: var(--s-danger);
}

.sync-toast {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 40;
  max-width: calc(100% - 40px);
  padding: 10px 18px;
  border-radius: 999px;
  background: #101a26;
  border: 1px solid var(--s-line);
  color: var(--s-fg);
  font-size: 12.5px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

@media (max-width: 420px) {
  .orb {
    width: 158px;
    height: 158px;
  }
  .card {
    padding: 17px;
  }
  .sync-main {
    width: calc(100% - 22px);
  }
}
</style>
