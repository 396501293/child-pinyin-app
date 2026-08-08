# 拼音星球

面向幼小衔接/一年级（6-7 岁）儿童的 iPad 横屏拼音学习 PWA：跟部编版一年级上册 13 课拼音进度走，13 颗星球 + 2 个空间站复习关的线性航线，每颗星球 [学] → [练1 听音辨认] → [练2 四声辨音] → [练3 拼读组合（飞船对接）]，按首次正确率得 1-3 星。另有两个自由练习（聪耳雷达=无尽听辨、拼读发射台=无尽拼读，共享间隔重复掌握度）、星星解锁的宇宙图鉴、多档案与家长小结。首次联网加载后**全程离线可用**（发音是预生成音频，非在线 TTS）。

姊妹项目：[数学夜航（child-math-app）](../child-math-app)——同栈（Preact + Vite + TS + vite-plugin-pwa），本项目 fork 其骨架后换「明亮扁平卡通太空」主题。

## 文档地图

- [`docs/superpowers/specs/2026-08-07-pinyin-planet-design.md`](./docs/superpowers/specs/2026-08-07-pinyin-planet-design.md) — 设计与实施计划（课程表、玩法、架构、里程碑），设计决策以此为权威来源。

## 本地开发

要求 **Node.js ≥ 20**（CI 用 Node 22）、**pnpm 9**（`package.json` 的 `packageManager` 已钉版本）。

```bash
pnpm install    # 安装依赖（--frozen-lockfile 语义见下）
pnpm dev        # 本地开发服务器（Vite）
pnpm test       # 全量单元测试（Vitest，含 charset/音频清单等一致性守卫）
pnpm build      # 类型检查 + 生产构建 → dist/（含 PWA 预缓存清单）
```

> 注：与数学夜航「不提交 package-lock.json」不同，本仓库**提交 `pnpm-lock.yaml`**——pnpm 9 的 lockfile 不含镜像地址，官方 registry 可直接复现解析，CI 里 `pnpm install --frozen-lockfile` 保证装的和本地完全一致。

## 资产再生成（产物已入库，CI 不碰）

三条生成管线都遵循同一哲学：**本地生成、产物提交、CI 只跑 Node**。平时无需执行，改了对应源数据再跑。

### 语音（public/audio/*.mp3，230 条）

音频唯一源是 `src/data/audio-script.json`（clipId → 汉字台词 + 文件名；技巧：让 TTS 念汉字而非拼音字母）。增改 clip 后：

```bash
bash scripts/gen-voice.sh              # edge-tts（微软在线 TTS），跳过已存在，可中断续跑
bash scripts/gen-voice.sh --only sy-   # 只处理指定 id 前缀
bash scripts/gen-voice.sh --force     # 全量重生成
```

生成后用**听审页**人耳把关：浏览器直接打开 `scripts/qa-listen.html`（file:// 即可），逐条试听并从 candidates（`scripts/audio-qa/`，已 gitignore）里挑替换。`pnpm test` 的清单守卫会确保 audio-script.json ↔ 磁盘 mp3 一一对应。

### 拼音字体子集（src/assets/fonts/andika-pinyin.woff2）

拼音专用 SIL Andika（识字教学字形：单层 a/g、调号全覆盖），只子集 Regular。`pnpm test` 报「字体子集缺字」时（=课程/界面新增了拼音字符）：

```bash
bash scripts/subset-andika.sh   # 需要 python3；783KB → 约 5KB
```

### PWA 图标（public/icons/）

源文件 `scripts/icon.svg`（糖果粉星球 + 白色 ā，与应用同一套设计 token），改后：

```bash
node scripts/gen-icons.mjs      # sharp 栅格化 192/512/180 三种尺寸
```

## 部署（GitHub Pages）

推送 `main` 即自动部署，工作流见 [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)（pnpm 安装 → 全量测试 → 构建 → 上传 Pages 产物，测试挂了不会发布）。

1. GitHub 上新建仓库，**仓库名必须为 `child-pinyin-app`**（与 `vite.config.ts` 的 `base: '/child-pinyin-app/'` 一致，否则静态资源 404）。
2. 仓库 **Settings → Pages** 将 **Source** 设为 **GitHub Actions**（先设置，避免首次推送时部署 Job 失败）。
3. 推送 `main`，完成后访问 `https://<你的用户名>.github.io/child-pinyin-app/`。

工作流会在上传产物前删除 `dist/` 中未使用的 `.woff` 回退字体（实际只加载 `.woff2`）。

## iPad 安装与使用

1. Safari 打开部署地址，分享按钮 → **添加到主屏幕**。
2. 从主屏图标启动（全屏、横屏，1024×768 舞台缩放适配）。
3. 首次联网加载完成后资源全部离线缓存，之后无网络可正常学练（含发音）。
4. **家长设置**：星系图右下角**长按齿轮约 1.5 秒**打开（防儿童误触），可看进度与易错音统计、调语音音量、管理多档案；数据全部存在本机。

## 待人工验收

- **23 条候选音 clip 听审**：`bash scripts/gen-voice.sh` 重建听审页 → 打开 `scripts/qa-listen.html` → 过「候选对比」区逐条听 → 胜者写回 `src/data/audio-script.json` 对应 clip 的 `say` → `bash scripts/gen-voice.sh --force --only <clipId>` 重生成该条 → `pnpm test` → 提交更新后的 mp3。
- **iPad 真机验收**：Safari 打开 `https://396501293.github.io/child-pinyin-app/` → 添加到主屏幕 → 从主屏图标全屏横屏启动 → 联网完整加载一遍 → 开飞行模式完整过第 1 颗星球（学 → 练1 → 练2 → 练3 → 拿星），确认全程发音可播。
- **双 AudioContext 真机混音行为**：sfx（`src/ui/sound.ts`）与语音（`src/audio/voice.ts`）各持一个 AudioContext，互不共享增益/打断逻辑；iOS 上是否互相抢占尚待真机验收，见 `src/ui/sound.ts` 头注释。
- **手感项**：长按齿轮开家长设置的触发手感、音量滑杆的持久化观感、双档案切换的选人屏体验，均待真机上过一遍。
