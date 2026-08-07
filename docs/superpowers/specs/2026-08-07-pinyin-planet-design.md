# 拼音星球（child-pinyin-app）设计与实施计划

## Context

给自家孩子（幼小衔接/一年级，6-7 岁）做的拼音学习 PWA，个人项目，目录 `~/Documents/workspace/child-pinyin-app`（当前为空）。姊妹项目 `child-math-app`（数学夜航，Preact+Vite+TS PWA，iPad 横屏，已上线 GitHub Pages）提供了经过验证的架构和大量可复用模块。本项目**同栈但换新主题**：明亮扁平卡通太空风（与数学夜航的暗色像素风区分），跟部编版一年级上册拼音 13 课进度走。

## 已确认的设计决策（用户逐项确认过）

- **目标用户**：幼小衔接/一年级，系统学声母、韵母、四声、拼读
- **设备**：iPad 横屏全屏 PWA（1024×768 固定舞台缩放）
- **技术**：Preact + Vite + TS，fork 数学夜航骨架；GitHub Pages 部署，base `/child-pinyin-app/`
- **发音**：构建时用 edge-tts 预生成音频（本地生成、mp3 提交进仓库、CI 不碰 edge-tts）。技巧：让 TTS 念**汉字**——声母呼读音用《汉语拼音方案》注音字（b→玻 p→坡 m→摸…），带调音节用常用字（bà→爸）
- **玩法**：听音辨认（三选一）+ 四声辨音（四选一）+ 拼读组合（飞船对接：选声母舱→韵母舱，三拼加介母舱）。不做描红、不做跟读评测
- **结构**：13 课=13 颗星球线性航线 + 2 个空间站复习关（第 8/13 课后）；每星球 [学]→[练1听辨]→[练2四声]→[练3拼读]，按首次正确率 1-3 星
- **自由练习**：聪耳雷达（无尽听辨，第 3 星球后解锁）、拼读发射台（无尽拼读，第 5 星球后解锁），共享掌握度追踪（间隔重复）
- **奖励**：轻量——点亮星球 + 星星总数解锁宇宙图鉴收藏品（10-15 个），无经济系统
- **无挫败原则**（继承数学夜航）：大按钮、错选抖动变灰原地重试、错误无惩罚音效、错题进冷却队列重现
- **家长层**：长按齿轮 1.5s 进设置，进度+易错音统计，数据全本地；多档案（3 娃）v1 就带上（storage 逻辑现成，只差 ProfilePicker UI）
- **字体**：拼音用 SIL Andika（识字专用字体，默认单层 ɑ/ɡ，声调符号全覆盖），subset 成 woff2 + charset 守卫测试；中文 UI 用系统字体栈（PingFang SC）

## 课程表（部编版一上）

1) a o e　2) i u ü y w + yi wu yu　3) b p m f　4) d t n l　5) g k h(三拼入门)　6) j q x(ü去点)　7) z c s + zi ci si　8) zh ch sh r + zhi chi shi ri　🛰️R1　9) ai ei ui(标调规则)　10) ao ou iu　11) ie üe er + ye yue　12) an en in un ün + yuan yin yun　13) ang eng ing ong + ying　🛰️R2

地图节点共 15 个：[L1..L8, R1, L9..L13, R2]。

## 文件布局

```
child-pinyin-app/
├── vite.config.ts / vitest.config.ts / tsconfig.json / index.html / .github/workflows/deploy.yml
├── public/audio/*.mp3          # ~350-450 个本地生成并提交的音频（2-4MB）
├── public/icons/               # PWA 图标（gen-icons.mjs + sharp，devDep）
├── scripts/
│   ├── gen-voice.sh            # python venv + edge-tts，读 src/data/audio-script.json，跳过已存在（可续跑）
│   └── subset-andika.sh        # 仿数学夜航 subset-font.sh；保留 --layout-features=ccmp,mark,mkmk
├── src/
│   ├── data/audio-script.json  # 唯一音频源：clipId → { say(汉字), file }；TS 和 Python 共读
│   ├── core/                   # 纯逻辑零 DOM，全测试
│   │   ├── pinyin.ts           # Syllable 模型、toneMark() 标调规则（a>o>e>i/u>ü、iu标u、ui标i、jqx+ü去点）
│   │   ├── curriculum.ts       # 13 课数据表 + 2 空间站 + NodeId 映射
│   │   ├── confusables.ts      # 易混表 b/d/p/q、n/l、f/t、ei/ie、ui/iu、an/ang、en/eng、in/ing…
│   │   ├── questions.ts        # ListenPick(3选1)/TonePick(4选1)/Blend(2-3段对接) 出题器
│   │   ├── mastery.ts          # FactState{s,cd} 状态机+权重 ← timesTable.ts 34-52 行原样搬
│   │   ├── lessonFlow.ts       # LessonSession ← TimesTableSession 骨架（scheduleRemeet +3..5、commit 幂等）
│   │   ├── progression.ts      # 解锁链、星级 starsFor(≥100%→3★ ≥80%→2★)、自由练习门槛
│   │   ├── collection.ts       # 图鉴：纯函数 unlockedItems(totalStars)，总星=13×9+2×3=123
│   │   ├── storage.ts          # key pinyin_planet_v1 ← 数学夜航 storage.ts ~80% 原样（safeStore/corrupt备份/多档案），删 v1 迁移
│   │   └── insight.ts / rand.ts / types.ts
│   ├── audio/
│   │   ├── voice.ts            # 新核心子系统：WebAudio clip 播放器，单 AudioContext + pointerdown 解锁，LRU 解码缓存(~80)，playClip/playSeq/say(fallback)
│   │   ├── manifest.ts         # clipForSyllable/clipForLetter，缺失即 throw（测试兜住）
│   │   └── tts.ts              # ← 数学夜航原样，降级为 fallback
│   ├── assets/fonts/andika-pinyin.woff2 + charset.txt
│   └── ui/
│       ├── App.tsx             # ← 数学夜航 App.tsx 结构 fork：refs/timers/answer 双分支/teardown；speak→playClip
│       ├── scale.ts            # 原样
│       ├── sound.ts            # fork 引擎，改柔和太空音色（sine/triangle）
│       ├── screens/ GalaxyMap, Learn, Practice, Result, Radar, Launchpad, Collection
│       └── components/ FourLineGrid(四线三格SVG), PinyinCard(←Options.tsx), PlanetIcon(代码画SVG星球),
│                       DockingShip, FeedbackOverlay(保留点击护盾契约), RotateOverlay, SettingsModal, ProfilePicker, StarRow
└── tests/ core/* + audio/manifest.test.ts + ui/charset.test.ts
```

## 里程碑（每个独立可验证；M1 后 M2/M3 可并行）

- **M0 脚手架**（0.5-1d）：git init、fork 配置文件/deploy.yml/scale.ts/RotateOverlay，base 改 `/child-pinyin-app/`，manifest 名「拼音星球」+亮色主题色，workbox globPatterns 加 mp3。验证：dev 出空舞台、test 绿、build 过
- **M1 拼音模型+课程表**（1.5-2d）：pinyin.ts/curriculum.ts/confusables.ts + 测试。重点测：toneMark 标调规则全覆盖、每条课程数据可 parse、**NFC 守卫**（防字体 subset 漏组合符）、易混项都是真实课程单元
- **M2 音频管线**（2-3d，含听审）：audio-script.json → gen-voice.sh → 提交 mp3；voice.ts/manifest.ts。难点顺序：声母注音字表→带调音节常用字→无常用字的裸韵母调（á ǎ ó ǒ…）用 per-clip candidates 批量生成后**人耳挑选**。验证：manifest.test.ts 四重守卫（课程引用全覆盖/文件存在/无孤儿/VOICE 台词齐）
- **M3 核心逻辑**（2-2.5d）：questions/mastery/lessonFlow/progression/storage/collection + 测试。仿数学夜航 generator.test.ts 的种子化属性测试（每课×500 seeds：选项含答案、3 项互异、易混优先）
- **M4 主线四屏**（3-4d）：App/GalaxyMap/Learn/Practice/Result + 组件 + Andika subset。齿轮长按照搬 Map.tsx 125-130 行；FourLineGrid 的 x-height 对中线是主要视觉调校点。验证：charset.test.ts（拼音字符+声调字面量集合∈charset.txt）+ iPad Safari 手动过第 1 课全流程
- **M5 自由练习+图鉴+家长层**（1.5-2d）：Radar/Launchpad（连击「只被答错清零、退出不清」规则照搬）、Collection、SettingsModal 加进度/易错统计
- **M6 打磨部署**（1-1.5d）：图标、重跑 subset+gen-voice、建 GitHub 仓库开 Pages、iPad A2HS + **飞行模式全离线**验收

总计 ~12-16 人天。

## 关键风险与对策

1. **edge-tts 脆弱**（非官方端点，会挂/限流）→ 本地生成+提交 mp3+可续跑，CI 纯 Node（与 subset-font.sh 同哲学）
2. **单字 TTS 发音质量**（多音字、轻声漂移、裸韵母调无常用字）→ M2 的听审是一等公民工作；candidates 机制；课程表可换用「妈麻马骂」类有好载字的练习音节
3. **iOS 音频解锁**：预录音频比 Web Speech 严格 → 全部走单一 AudioContext，首次 pointerdown resume（sound.ts ac() 模式），解锁后定时器驱动的自动播放合法；处理 visibilitychange 重 resume；不裸用 `<audio>.play()`
4. **编码格式**：不用 opus（iOS 只认 CAF 容器里的 opus）→ edge-tts 原生 24kHz/48kbps mono mp3
5. **内存**：不预解码全部 clip（≈50-70MB PCM）→ LRU 解码缓存 + 每课预热；离线靠 workbox 预缓存
6. **NFD 混入源码** → NFC 守卫测试双保险 + subset 保留 ccmp/mark/mkmk
7. 四声题 4 个目标（偏离 3 目标惯例）是有意为之，卡片保持 ≥180px

## 验证方式

- 每里程碑：`npm test`（Vitest，core 全覆盖 + manifest/charset 守卫）+ `npm run build`（tsc --noEmit 硬门槛）
- 部署门槛与数学夜航一致：CI test→build→Pages，缺 mp3 或缺字形直接挡部署
- 最终验收：iPad Safari 添加到主屏幕，飞行模式下完整过一颗星球（学→练1→练2→练3→拿星→地图点亮），音频全可播

## 实施纪律

- 开工时先 `git init`，把本设计存为 `docs/superpowers/specs/2026-08-07-pinyin-planet-design.md` 并提交（沿用数学夜航的 docs/superpowers 惯例）
- 遵循数学夜航既有约定：core/ui 分离、App.tsx 独占状态、无惩罚设计规则、package-lock 不提交（本机私有 npm 镜像会破坏 CI）
- 逐里程碑走 TDD（superpowers:test-driven-development），完成后跑验证再 commit
