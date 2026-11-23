# 手机 → 电脑 一键同步

目标：手机上随手写的笔记，点一下就能进到这台电脑的 Markdown 目录里，并自动提交、推送、发布到 GitHub Pages。前提是电脑开机、同步服务在跑，手机和电脑在同一个局域网。

## 为什么同步面板由电脑提供

公开主页是 `https://juyaohui.github.io/`。浏览器有一条硬性规则：**HTTPS 页面不能请求局域网里的 HTTP 接口**（mixed content）。因此：

- 公开站点的 `/sync/` 只做说明与入口，检测不到电脑端 API；
- 电脑端 `pnpm sync` 会把**构建好的站点**一起托管在 `http://<电脑IP>:5178/`；
- 手机打开这个局域网地址时，页面与 `/api/*` 同源，直接可用，没有任何跨域/混合内容问题。

扫码 → 打开局域网页面 → 添加到主屏幕，体验和原生 App 接近（HTTP 下 Service Worker 不可用，所以没有离线安装，仅桌面快捷方式）。

## 拓扑

```
┌──────────────┐   同一 Wi-Fi     ┌────────────────────────────┐
│   手机浏览器   │ ───────────────▶ │  PC · apps/relay (5178)    │
│  /sync/ 页面   │   HTTP + SSE    │  Fastify + 静态站点 + git   │
└──────────────┘                 └─────────────┬──────────────┘
        ▲                                      │ 写入 Markdown
        │ 扫码 / 配对码                          ▼
┌──────────────┐                 ┌────────────────────────────┐
│  电脑终端 /pair│                 │ apps/web/src/posts/*.md    │
└──────────────┘                 └─────────────┬──────────────┘
                                               │ commit + push
                                               ▼
                                  ┌────────────────────────────┐
                                  │ GitHub Actions → Pages     │
                                  └────────────────────────────┘
```

## 时序

1. PC 启动：生成 6 位配对码（10 分钟有效），打印局域网 URL 与二维码；若 `apps/web/.vitepress/dist` 存在，同时托管站点。
2. 手机打开 `http://<ip>:5178/sync/?code=123456`。
3. 页面 `POST /api/pair`，携带配对码与设备名；服务端校验后返回一次性 token（服务端只存 SHA-256 哈希）。
4. token 存 `localStorage`；页面打开 `/api/events`（SSE）接收同步进度。
5. 用户写笔记 → 存在 `localStorage` 队列 → 点「一键同步」。
6. `POST /api/sync`（Bearer token）提交队列；服务端逐条写入内容目录，维护 `item.id → 文件路径 + 内容哈希` 索引。
7. 有写入时执行 `git add <files>` → `git commit` → `git push`；失败不影响落盘。
8. GitHub Actions 构建 Pages；手机端展示提交短 SHA。

## 接口

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/health` | 否 | `{ ok, name, version, protocol, time }` |
| GET | `/api/info` | 否 | 电脑名、局域网地址、最近提交、是否已配对设备 |
| POST | `/api/pair` | 配对码 | `{ code, device:{name,platform} }` → `{ token, device, server }` |
| POST | `/api/sync` | Bearer | `{ deviceId, clientTime, items: SyncItem[] }` → `SyncResponse` |
| GET | `/api/events?token=` | Bearer | SSE，进度事件 `{ phase, message, at }` |
| POST | `/api/devices/revoke` | Bearer | 注销当前设备 |
| GET | `/pair` | 否 | 电脑端二维码页面 |
| GET | `/` 及静态路径 | 否 | 构建好的站点 |

`SyncItem`：

```ts
{
  id: string          // 客户端 uuid，用于更新而不是重复创建
  title: string
  content: string     // Markdown 正文，不含 frontmatter
  tags: string[]
  target: "essay" | "tech" | "note"   // posts/随笔 | posts/技术栈 | notes/移动端
  createdAt: string
  updatedAt: string
}
```

## 安全设计

- **仅局域网**：默认拒绝非私有网段来源（`10/8`、`172.16/12`、`192.168/16`、loopback）；`allowWan` 可关掉该限制。
- **token**：32 字节随机值，服务端存 SHA-256；比较使用 `timingSafeEqual`。
- **配对码**：6 位数字，10 分钟轮换，按 IP 限制 10 次/10 分钟。
- **路径**：目标目录由协议枚举固定，客户端不能传路径；文件名由服务端根据标题和日期生成，写前校验解析后的绝对路径仍在内容根目录内。
- **大小**：单条 200KB、单次 4MB、最多 100 条（`packages/shared` 的 `LIMITS`）。
- **冲突**：电脑上改过同一文件时不覆盖，另存 `*.conflict-<timestamp>.md`，手机端显示 `conflict`。
- **token 文件**：`.secrets/github.token` 被 gitignore；也可依赖系统 git 凭据。

## 失败与边界

| 场景 | 行为 |
| --- | --- |
| 电脑没开 / 服务没跑 | 手机端显示「电脑离线」，队列保存在本地，稍后再点 |
| 推送失败（断网、token 过期） | 文件与本地 commit 成功，返回 `pushed:false`，手机端提示「已提交到本地」 |
| 同一标题重复 | 文件名自动加 `-2`、`-3`，不覆盖 |
| 电脑上编辑过 | 生成冲突副本，原文件保留 |
| 配对码过期 | 重启服务会自动生成新码；`/pair` 页面实时显示当前码 |
| 端口被占用 | 启动时提示修改 `relay.config.json` 的 `port` |
| 手机打不开 | Windows 防火墙放行 5178（专用网络）；确认同一网段 |

## 可以继续做的

- 反向同步（PC → 手机离线阅读）；
- 图片上传（当前只同步 Markdown 文本）；
- 把同步面板做成真正可安装的 PWA（需要给局域网服务配受信任的 HTTPS 证书，例如 mkcert + 手机安装根证书）。
