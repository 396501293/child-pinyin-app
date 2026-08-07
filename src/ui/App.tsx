// 应用状态机 —— fork 自数学夜航 App.tsx 的核心 idiom：
//   - sessionRef/progressRef 镜像 ref：定时器/序列回调读最新值，不吃闭包旧值
//   - lessonRef（ref-truth）：LessonSession 活在 Preact state 之外，Session 只镜像渲染字段
//   - answer 双分支：答对 sfx+夸奖 clip+遮罩 1.1s 推进；答错排除+抖动、0.9s 清除原地重试
//   - blend 全段通过后播拼读序列（可长于 1.1s），护盾 held 到序列播完再推进（seqGen 守护）
//   - exitToMap teardown：clearTimer + stopVoice + 会话作废，杜绝离屏后定时器复活
import { useEffect, useRef, useState } from 'preact/hooks';
import { markCollectionSeen, newlyUnlocked, unlockedItems } from '../core/collection';
import { LESSONS, nodeToContent } from '../core/curriculum';
import type { Lesson, NodeId } from '../core/curriculum';
import { isStreakMilestone, settleFreeSlice, streakOnCorrect, streakOnWrong } from '../core/freePlay';
import { LessonSession } from '../core/lessonFlow';
import { applyMasteryAnswer, startMasterySession } from '../core/mastery';
import type { MasterySession } from '../core/mastery';
import { launchpadPool, launchpadUnlocked, MAX_NODE, planetOf, radarPool, radarUnlocked, totalStars } from '../core/progression';
import { buildLaunchpadQuestion, buildPractice, buildRadarQuestion, buildStation, questionItem } from '../core/questions';
import type { Blend, Question } from '../core/questions';
import { addProfile, defaultProgress, loadProgress, profileMeta, saveProgress, setActiveProfile } from '../core/storage';
import type { PlanetProgress, Progress } from '../core/types';
import { clipForLetter, clipForWholeRead } from '../audio/manifest';
import type { ClipId } from '../audio/manifest';
import { RIGHT_LINES, VOICE } from '../audio/lines';
import { playClip, playSeq, setClipVolume, stopVoice, warmLesson } from '../audio/voice';
import type { FreeSession, Screen, Session } from './session';
import { sfx } from './sound';
import { useStageScale } from './scale';
import { Collection } from './screens/Collection';
import { GalaxyMap } from './screens/GalaxyMap';
import { Launchpad } from './screens/Launchpad';
import { Learn } from './screens/Learn';
import { Practice } from './screens/Practice';
import { Radar } from './screens/Radar';
import { Result } from './screens/Result';
import { RotateOverlay } from './components/RotateOverlay';
import { SettingsModal } from './components/SettingsModal';
import { ProfilePicker } from './components/ProfilePicker';

// 竖屏检测——结构与姊妹项目 App.tsx 的 usePortrait 一致（scale.ts 旁未导出，本地复刻）。
function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  useEffect(() => {
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return portrait;
}

// Question 接口的 clip 是 string（core 不依赖 manifest 类型），但值一律出自
// clipFor*（性质测试保证）——此处集中收窄一次。
const clipOf = (q: Question): ClipId => q.clip as ClipId;

// 拼读序列「声母 —（介母）— 韵母 — 整音节」的 clip 列表（对接成功播放 + 预热共用）。
function blendParts(q: Blend): ClipId[] {
  const ids: ClipId[] = [];
  if (q.target.initial !== '') ids.push(clipForLetter(q.target.initial));
  if (q.target.medial !== undefined) ids.push(clipForLetter(q.target.medial));
  ids.push(clipForLetter(q.target.final), clipOf(q));
  return ids;
}

// 预热一轮练习会用到的 clips（题音 + blend 部件音 + 夸奖语），失败不响。
function warmQueue(queue: Question[]): void {
  const ids = new Set<ClipId>(RIGHT_LINES);
  for (const q of queue) {
    ids.add(clipOf(q));
    if (q.kind === 'blend') for (const id of blendParts(q)) ids.add(id);
  }
  warmLesson([...ids]);
}

// sessionStorage 访问助手：getter 本身在禁 cookie/嵌入式 webview 下会抛
// SecurityError，可选链挡不住——统一 try/catch（对齐 storage.ts safeStore 约定）。
// 失败静默降级：代价只是每次启动都出选人屏。
function sessionGet(k: string): string | null {
  try { return globalThis.sessionStorage?.getItem(k) ?? null; } catch { return null; }
}
function sessionSet(k: string, v: string | null): void {
  try {
    if (v === null) globalThis.sessionStorage?.removeItem(k);
    else globalThis.sessionStorage?.setItem(k, v);
  } catch { /* 私密模式/SecurityError */ }
}

export function App() {
  const [progress, setProgressState] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>('map');
  const [session, setSession] = useState<Session | null>(null);
  const [freeSession, setFreeSession] = useState<FreeSession | null>(null);
  const [learnNode, setLearnNode] = useState<NodeId | null>(null);
  const [collectionNew, setCollectionNew] = useState<string[]>([]);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scale = useStageScale();
  const portrait = usePortrait();

  // 选人屏（多档案）：≥2 档案且本次会话未选过 → 启动先选人。
  // 选同一档案直接进入；选其他档案切 active 后整页重载（干净重置全部会话态）。
  const [needPick, setNeedPick] = useState(
    () => profileMeta().count > 1 && !sessionGet('pp_profile_picked'),
  );
  const pickProfile = (i: number) => {
    sessionSet('pp_profile_picked', '1');
    void playClip(VOICE.welcome); // 点选即手势：AudioContext 已解锁，欢迎语合法
    if (i === profileMeta().active) { setNeedPick(false); return; }
    setActiveProfile(i);
    location.reload();
  };
  const doAddProfile = () => {
    addProfile();
    setSettingsOpen(false);
  };
  const doSwitchProfile = () => {
    sessionSet('pp_profile_picked', null);
    location.reload();
  };

  // 反馈延迟推进的定时器；退出/卸载时清除，避免离开练习屏后仍触发。
  const timerRef = useRef<number | undefined>(undefined);
  // 供定时器/序列回调读取最新 session/progress（避免闭包读到旧值）。
  const sessionRef = useRef<Session | null>(session);
  sessionRef.current = session;
  const progressRef = useRef<Progress>(progress);
  progressRef.current = progress;
  // 会话真身（ref-truth）：出题队列/再见面/星级记账都在这里，Session 只镜像。
  const lessonRef = useRef<LessonSession | null>(null);
  // 自由练习真身：抽样池 + 掌握度工作副本（每答替换 mastery，退出 settleFreeSlice）。
  const freePlayRef = useRef<{ pool: string[]; mastery: MasterySession } | null>(null);
  const freeRef = useRef<FreeSession | null>(freeSession);
  freeRef.current = freeSession;
  // 拼读序列的时代计数：exitToMap/重开会话时 ++，令在途 playSeq().then 安静放弃。
  const seqGenRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };
  useEffect(() => () => clearTimer(), []);

  // 回图小结 toast（自由练习退出「答了 N 题」）：2.6s 自动消失，卸载清定时器。
  const toastTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);
  const showToast = (text: string) => {
    window.clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), text });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  // 启动即应用持久化音量（滑杆变更走 updateSettings）。
  useEffect(() => { setClipVolume(progressRef.current.settings.clipVolume); }, []);

  const updateProgress = (p: Progress) => {
    // 同步刷 ref：setProgressState 是异步的，同一事件回调里紧接着读
    // progressRef 必须拿到新值（finishSession 的解锁对比依赖这一点）。
    progressRef.current = p;
    setProgressState(p);
    saveProgress(p);
  };

  // ── 学一学 ────────────────────────────────────────────────────────────────
  const startLearn = (node: NodeId) => {
    const c = nodeToContent(node);
    if (c.kind !== 'lesson') return;
    const ids = c.lesson.newLetters.map(clipForLetter);
    for (const w of c.lesson.wholeRead ?? []) ids.push(clipForWholeRead(w));
    warmLesson(ids);
    setLearnNode(node);
    setScreen('learn');
  };

  const tapLearnUnit = (unit: string, kind: 'letter' | 'whole') => {
    void playClip(kind === 'letter' ? clipForLetter(unit) : clipForWholeRead(unit));
  };

  // 「学」完成（全部卡片点过）：写 planets[id].learned 并落盘。幂等——重游不重复响。
  const markLearned = (lessonId: number) => {
    const p = progressRef.current;
    const planet = planetOf(p, lessonId);
    if (planet.learned) return;
    sfx.star();
    updateProgress({ ...p, planets: { ...p.planets, [lessonId]: { ...planet, learned: true } } });
  };

  // ── 练习会话 ──────────────────────────────────────────────────────────────
  const startPractice = (node: NodeId, practice: 1 | 2 | 3) => {
    clearTimer();
    seqGenRef.current++;
    const c = nodeToContent(node);
    const queue =
      c.kind === 'lesson'
        ? buildPractice(c.lesson, practice, Math.random)
        : buildStation(c.station, Math.random);
    const ls = new LessonSession(queue, { node, practice }, Math.random);
    const q = ls.current();
    if (!q) return; // 空队列理论不可达（curriculum 数据约束每课 ≥6 条）
    lessonRef.current = ls;
    warmQueue(queue);
    // 开场白（按首题类型/空间站）+ 首题音，一个序列念完
    const intro =
      c.kind === 'station' ? VOICE.station
      : q.kind === 'tone-pick' ? VOICE.gameTone
      : q.kind === 'blend' ? VOICE.gameBlend
      : VOICE.gameListen;
    void playSeq([intro, clipOf(q)]);
    setSession({
      node,
      practice,
      station: c.kind === 'station',
      qIndex: 0,
      length: ls.length,
      total: ls.total,
      current: q,
      feedback: null,
      excluded: [],
      stage: 0,
      docked: [],
    });
    setScreen('practice');
  };

  // 答对推进（1.1s 窗口后 / blend 序列播完后）：镜像下一题或进结算。
  const advance = () => {
    const s = sessionRef.current;
    const ls = lessonRef.current;
    if (!s || !ls) return;
    clearTimer();
    if (ls.isDone()) { finishSession(); return; }
    const q = ls.current()!;
    void playClip(clipOf(q)); // 进新题自动播题音（首手势解锁后合法）
    setSession({
      ...s,
      qIndex: ls.index,
      length: ls.length,
      current: q,
      feedback: null,
      excluded: [],
      lastWrong: undefined,
      stage: 0,
      docked: [],
    });
  };

  // 结算：commitToProgress 恰一次 → 落盘 → 结算屏；解锁对比在落盘前算定。
  // 注意：反馈期的 FeedbackOverlay 遮罩挡住退出键（点击护盾契约，见该组件头注），
  // 所以走到这里的会话必然完整——改动遮罩需同步审视此处时序。
  const finishSession = () => {
    const s = sessionRef.current;
    const ls = lessonRef.current;
    if (!s || !ls) return;
    clearTimer();
    const stars = ls.starsEarned();
    const prev = progressRef.current;
    const next = ls.commitToProgress(prev);
    const unlockedNext = next.unlocked > prev.unlocked;
    const radarNew = !radarUnlocked(prev) && radarUnlocked(next);
    const launchNew = !launchpadUnlocked(prev) && launchpadUnlocked(next);
    // 图鉴「新伙伴」横幅：星星跨过门槛且图鉴里还没看过（揭示动画留给图鉴到访）
    const newItems = newlyUnlocked(next, totalStars(prev), totalStars(next)).map((c) => c.name);
    updateProgress(next);
    lessonRef.current = null; // 已结算，杜绝二次 commit
    sfx.chord();
    const lines: ClipId[] = [stars >= 3 ? VOICE.star1 : VOICE.star2];
    if (unlockedNext) lines.push(VOICE.unlockPlanet);
    if (radarNew) lines.push(VOICE.unlockRadar); // 解锁台词只在此结算时刻播（M5 屏内不重播）
    if (launchNew) lines.push(VOICE.unlockLaunch);
    seqGenRef.current++;
    void playSeq(lines);
    setSession({ ...s, feedback: null, resultStars: stars, resultUnlockedNext: unlockedNext, resultNewItems: newItems });
    setScreen('result');
  };

  // 批改（listen-pick / tone-pick）。答对：轻钟 + 随机夸奖 clip（播不等待，
  // 须在 1.1s 窗内念完）+ 遮罩推进。答错：无任何音效（无惩罚纪律），排除 + 抖动，
  // 0.9s 清除后重播题音（听辨题重试前必须能再听一次）原地重试。
  const answer = (picked: string) => {
    const s = sessionRef.current;
    const ls = lessonRef.current;
    if (!s || !ls || s.feedback !== null) return;
    const q = s.current;
    if (!q) return;
    if (q.kind === 'blend') { answerBlendStage(picked); return; }
    clearTimer();
    if (picked === q.answer) {
      ls.answer(true);
      sfx.right();
      void playClip(RIGHT_LINES[Math.floor(Math.random() * RIGHT_LINES.length)]);
      setSession({ ...s, feedback: 'right' });
      timerRef.current = window.setTimeout(advance, 1100);
    } else {
      ls.answer(false, picked);
      setSession({ ...s, feedback: 'wrong', excluded: [...s.excluded, picked], lastWrong: picked });
      timerRef.current = window.setTimeout(() => {
        const prevS = sessionRef.current;
        if (!prevS || prevS.feedback !== 'wrong') return;
        setSession({ ...prevS, feedback: null, lastWrong: undefined });
        void playClip(clipOf(q)); // 重听一遍再试
      }, 900);
    }
  };

  // 拼读对接逐段批改。任一段选错 = 本题首答错（LessonSession.answer(false, picked)，
  // 后续重试仍 false 但不重复计——见 questions.Blend 的判定语义注释），该段原地重试；
  // 全部段走完 → answer(true) 推进。全段通过后播拼读序列「b — a — bà」，
  // 序列可长于 1.1s：护盾（feedback='right' 的遮罩）held 到播完，seqGen 防退出后复活。
  const answerBlendStage = (picked: string) => {
    const s = sessionRef.current;
    const ls = lessonRef.current;
    if (!s || !ls || s.feedback !== null) return;
    const q = s.current;
    if (!q || q.kind !== 'blend') return;
    const st = q.stages[s.stage];
    clearTimer();
    if (picked !== st.answer) {
      ls.answer(false, picked);
      setSession({ ...s, feedback: 'wrong', excluded: [...s.excluded, picked], lastWrong: picked });
      timerRef.current = window.setTimeout(() => {
        const prevS = sessionRef.current;
        if (!prevS || prevS.feedback !== 'wrong') return;
        setSession({ ...prevS, feedback: null, lastWrong: undefined });
        void playClip(clipOf(q)); // 重听整个音节再对接
      }, 900);
      return;
    }
    sfx.dock();
    const docked = [...s.docked, picked];
    if (s.stage + 1 < q.stages.length) {
      // 段间推进不设反馈窗：对接音 + 舱位点亮即是确认，下一段立即可选
      setSession({ ...s, docked, stage: s.stage + 1, excluded: [], lastWrong: undefined });
      return;
    }
    // 最后一段对接成功 → 整题作答（首答对错已在段错时定档）
    ls.answer(true);
    setSession({ ...s, docked, feedback: 'right' });
    const gen = ++seqGenRef.current;
    void playSeq(blendParts(q)).then(() => {
      // 序列被打断（退出/重开）或时代已变：安静放弃，不推进
      if (gen !== seqGenRef.current || lessonRef.current !== ls) return;
      advance();
    });
  };

  const replayClip = () => {
    const s = sessionRef.current;
    if (s?.current) void playClip(clipOf(s.current));
  };

  // 退出 teardown（数学夜航纪律）：定时器、语音、序列时代、会话对象一并清干净。
  const exitToMap = () => {
    clearTimer();
    seqGenRef.current++;
    stopVoice();
    lessonRef.current = null;
    setSession(null);
    setLearnNode(null);
    setScreen('map');
  };

  // 结算屏「再来一次」：同一节点同一练重开新会话。
  const retrySession = () => {
    const s = sessionRef.current;
    if (!s) return;
    startPractice(s.node, s.practice);
  };

  // ── 自由练习（雷达/发射台）────────────────────────────────────────────────
  // 无尽流（fork 自数学夜航 endless）：一次一题按掌握度加权抽样，无队列无星级，
  // 退出是唯一终点。掌握度经 mastery.ts 状态机（startMasterySession/applyMasteryAnswer/
  // settleFreeSlice），UI 不手搓规则；连击铁律「只被答错清零、退出不清」在 core/freePlay。

  const buildFreeQuestion = (mode: 'radar' | 'launchpad', pool: string[], m: MasterySession): Question =>
    mode === 'radar'
      ? buildRadarQuestion(pool, m.states, Math.random)
      : buildLaunchpadQuestion(pool, m.states, Math.random);

  const startFree = (mode: 'radar' | 'launchpad') => {
    const p = progressRef.current;
    const pool = mode === 'radar' ? radarPool(p) : launchpadPool(p);
    if (pool.length === 0) return; // 门槛未过（入口已禁用，防御）
    clearTimer();
    seqGenRef.current++;
    const mastery = startMasterySession((mode === 'radar' ? p.radar : p.launchpad).items);
    const q = buildFreeQuestion(mode, pool, mastery);
    freePlayRef.current = { pool, mastery };
    warmQueue([q]);
    void playSeq([mode === 'radar' ? VOICE.gameListen : VOICE.gameBlend, clipOf(q)]);
    setFreeSession({
      mode,
      current: q,
      answered: 0,
      firstTry: 0,
      wrongThis: false,
      feedback: null,
      excluded: [],
      stage: 0,
      docked: [],
      streak: mode === 'launchpad' ? p.launchpad.streak : 0,
      milestone: null,
    });
    setScreen(mode);
  };

  // 答对推进：完成计数 +1，按最新掌握度抽下一题（每题新建，无「队列」概念）。
  const advanceFree = () => {
    const s = freeRef.current;
    const fp = freePlayRef.current;
    if (!s || !fp) return;
    clearTimer();
    const q = buildFreeQuestion(s.mode, fp.pool, fp.mastery);
    if (q.kind === 'blend') warmQueue([q]);
    void playClip(clipOf(q));
    setFreeSession({
      ...s,
      current: q,
      answered: s.answered + 1,
      firstTry: s.firstTry + (s.wrongThis ? 0 : 1),
      wrongThis: false,
      feedback: null,
      excluded: [],
      lastWrong: undefined,
      stage: 0,
      docked: [],
      milestone: null,
    });
  };

  // 雷达批改（listen-pick）：与主线 answer 同一双分支节奏（对 1.1s 推进 / 错 0.9s 重试），
  // 差异只在记账走 applyMasteryAnswer（resolved-once/重试 cd=1 纪律在 mastery 内）。
  const answerFree = (picked: string) => {
    const s = freeRef.current;
    const fp = freePlayRef.current;
    if (!s || !fp || s.feedback !== null) return;
    const q = s.current;
    if (q.kind === 'blend') { answerFreeBlendStage(picked); return; }
    if (q.kind !== 'listen-pick') return;
    clearTimer();
    const item = questionItem(q);
    if (picked === q.answer) {
      fp.mastery = applyMasteryAnswer(fp.mastery, item, true);
      sfx.right();
      void playClip(RIGHT_LINES[Math.floor(Math.random() * RIGHT_LINES.length)]);
      setFreeSession({ ...s, feedback: 'right' });
      timerRef.current = window.setTimeout(advanceFree, 1100);
    } else {
      fp.mastery = applyMasteryAnswer(fp.mastery, item, false);
      setFreeSession({ ...s, feedback: 'wrong', wrongThis: true, excluded: [...s.excluded, picked], lastWrong: picked });
      timerRef.current = window.setTimeout(() => {
        const prev = freeRef.current;
        if (!prev || prev.feedback !== 'wrong') return;
        setFreeSession({ ...prev, feedback: null, lastWrong: undefined });
        void playClip(clipOf(q)); // 重听一遍再试
      }, 900);
    }
  };

  // 发射台拼读逐段批改（与主线 answerBlendStage 同构；题面/护盾/序列 idiom 一致，
  // 记账换 mastery+连击——抽共享会给 M4 已稳的主线换骨架，接受此最小重复）。
  // 连击随答落盘（fork 铁律：清零与 +1 都立即写 progress，强退不丢）。
  const answerFreeBlendStage = (picked: string) => {
    const s = freeRef.current;
    const fp = freePlayRef.current;
    if (!s || !fp || s.feedback !== null) return;
    const q = s.current;
    if (q.kind !== 'blend') return;
    const st = q.stages[s.stage];
    clearTimer();
    const item = questionItem(q);
    if (picked !== st.answer) {
      fp.mastery = applyMasteryAnswer(fp.mastery, item, false);
      const p = progressRef.current;
      const cleared = streakOnWrong({ streak: p.launchpad.streak, bestStreak: p.launchpad.bestStreak });
      if (cleared.streak !== p.launchpad.streak) {
        updateProgress({ ...p, launchpad: { ...p.launchpad, ...cleared } });
      }
      setFreeSession({ ...s, streak: 0, wrongThis: true, feedback: 'wrong', excluded: [...s.excluded, picked], lastWrong: picked });
      timerRef.current = window.setTimeout(() => {
        const prev = freeRef.current;
        if (!prev || prev.feedback !== 'wrong') return;
        setFreeSession({ ...prev, feedback: null, lastWrong: undefined });
        void playClip(clipOf(q)); // 重听整个音节再对接
      }, 900);
      return;
    }
    sfx.dock();
    const docked = [...s.docked, picked];
    if (s.stage + 1 < q.stages.length) {
      setFreeSession({ ...s, docked, stage: s.stage + 1, excluded: [], lastWrong: undefined });
      return;
    }
    // 整题完成：掌握度记一次对答（曾错过的条目由 mastery 自判 retry-correct）
    fp.mastery = applyMasteryAnswer(fp.mastery, item, true);
    let streak = s.streak;
    let milestone: number | null = null;
    if (!s.wrongThis) {
      const p = progressRef.current;
      const next = streakOnCorrect({ streak: p.launchpad.streak, bestStreak: p.launchpad.bestStreak });
      updateProgress({ ...p, launchpad: { ...p.launchpad, ...next } });
      streak = next.streak;
      if (isStreakMilestone(streak)) {
        milestone = streak;
        sfx.star();
      }
    }
    setFreeSession({ ...s, docked, streak, milestone, feedback: 'right' });
    const gen = ++seqGenRef.current;
    void playSeq(blendParts(q)).then(() => {
      if (gen !== seqGenRef.current || freePlayRef.current !== fp) return;
      advanceFree();
    });
  };

  const replayFree = () => {
    const s = freeRef.current;
    if (s) void playClip(clipOf(s.current));
  };

  // 自由练习唯一终点：结算掌握度切片（cd−1、sessions+1、total 累计）→ 落盘 → 回图。
  // 反馈遮罩挡住退出键（点击护盾契约），到这里不会有在途推进定时器与结算赛跑；
  // freePlayRef 先置空杜绝二次结算。应用强退（刷新/杀进程）不结算——退出才是终点。
  const finishFree = () => {
    const s = freeRef.current;
    const fp = freePlayRef.current;
    clearTimer();
    seqGenRef.current++;
    stopVoice();
    if (s && fp) {
      freePlayRef.current = null;
      const p = progressRef.current;
      const next =
        s.mode === 'radar'
          ? { ...p, radar: settleFreeSlice(p.radar, fp.mastery.states, s.answered) }
          : { ...p, launchpad: settleFreeSlice(p.launchpad, fp.mastery.states, s.answered) };
      updateProgress(next);
      if (s.answered > 0) {
        sfx.chord();
        showToast(`太棒了，答了 ${s.answered} 题！`);
      }
    }
    setFreeSession(null);
    setScreen('map');
  };

  // ── 宇宙图鉴 ──────────────────────────────────────────────────────────────
  // 进屏时算好「本次新点亮」名单（揭示动画用）并立即 markCollectionSeen 落盘——
  // 「新」只揭示一次，早退也不重复弹（保持轻量，无确认流程）。
  const startCollection = () => {
    const p = progressRef.current;
    const unlocked = unlockedItems(totalStars(p));
    const fresh = unlocked.filter((c) => !p.collectionSeen.includes(c.id)).map((c) => c.id);
    setCollectionNew(fresh);
    if (fresh.length > 0) {
      sfx.star();
      updateProgress(markCollectionSeen(p, unlocked.map((c) => c.id)));
    }
    setScreen('collection');
  };

  // ── 家长设置 ──────────────────────────────────────────────────────────────
  const updateSettings = (patch: Partial<Progress['settings']>) => {
    if (patch.clipVolume !== undefined) setClipVolume(patch.clipVolume);
    updateProgress({ ...progressRef.current, settings: { ...progressRef.current.settings, ...patch } });
  };
  const resetProgress = () => {
    clearTimer();
    seqGenRef.current++;
    stopVoice();
    lessonRef.current = null;
    freePlayRef.current = null; // 重置即弃：自由练习会话不结算（进度都清了）
    const d = defaultProgress();
    setClipVolume(d.settings.clipVolume);
    updateProgress(d);
    setSettingsOpen(false);
    setSession(null);
    setFreeSession(null);
    setLearnNode(null);
    setScreen('map');
  };
  const unlockAll = () => {
    updateProgress({ ...progressRef.current, unlocked: MAX_NODE });
    setSettingsOpen(false);
  };
  // 一键满星（开发调试用，仅 DEV 构建可见）：unlock-all 只推解锁链不给星，
  // 雷达/发射台门槛要的是 planetCleared（三练都 ≥1★）——测门槛/图鉴须有此后门。
  const fillAllStars = () => {
    const planets: Record<number, PlanetProgress> = {};
    for (const l of LESSONS) planets[l.id] = { learned: true, stars: [3, 3, 3] };
    updateProgress({
      ...progressRef.current,
      planets,
      stations: { r1: 3, r2: 3 },
      unlocked: MAX_NODE,
    });
    setSettingsOpen(false);
  };

  // 选人屏优先于一切：选完才进应用
  if (needPick) {
    return (
      <div class="pp-viewport">
        <div class="pp-stage" style={{ transform: `scale(${scale})` }}>
          <ProfilePicker onPick={pickProfile} />
        </div>
        {portrait && <RotateOverlay />}
      </div>
    );
  }

  const learnContent = learnNode !== null ? nodeToContent(learnNode) : null;
  const learnLesson: Lesson | null = learnContent?.kind === 'lesson' ? learnContent.lesson : null;
  const resultContent = session !== null ? nodeToContent(session.node) : null;
  const resultLesson: Lesson | null = resultContent?.kind === 'lesson' ? resultContent.lesson : null;

  return (
    <div class="pp-viewport">
      <div class="pp-stage" style={{ transform: `scale(${scale})` }}>
        {screen === 'map' && (
          <GalaxyMap
            progress={progress}
            onStartLearn={startLearn}
            onStartPractice={startPractice}
            onOpenRadar={() => startFree('radar')}
            onOpenLaunchpad={() => startFree('launchpad')}
            onOpenCollection={startCollection}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
        {screen === 'map' && toast && (
          <div key={toast.id} class="pp-toast">{toast.text}</div>
        )}
        {screen === 'learn' && learnLesson && (
          <Learn
            lesson={learnLesson}
            learned={planetOf(progress, learnLesson.id).learned}
            onTapUnit={tapLearnUnit}
            onComplete={() => markLearned(learnLesson.id)}
            onGoPractice={() => startPractice(learnNode!, 1)}
            onExit={exitToMap}
          />
        )}
        {screen === 'practice' && session && (
          <Practice session={session} onPick={answer} onReplay={replayClip} onExit={exitToMap} />
        )}
        {screen === 'result' && session && (
          <Result
            stars={session.resultStars ?? 0}
            station={session.station}
            lesson={resultLesson}
            practice={session.practice}
            unlockedNext={!!session.resultUnlockedNext}
            newItems={session.resultNewItems ?? []}
            onRetry={retrySession}
            onBackToMap={exitToMap}
          />
        )}
        {screen === 'radar' && freeSession && (
          <Radar session={freeSession} onPick={answerFree} onReplay={replayFree} onExit={finishFree} />
        )}
        {screen === 'launchpad' && freeSession && (
          <Launchpad session={freeSession} onPick={answerFree} onReplay={replayFree} onExit={finishFree} />
        )}
        {screen === 'collection' && (
          <Collection stars={totalStars(progress)} newIds={collectionNew} onExit={exitToMap} />
        )}
        {settingsOpen && (
          <SettingsModal
            progress={progress}
            onUpdateSettings={updateSettings}
            onResetProgress={resetProgress}
            onUnlockAll={unlockAll}
            onFillStars={fillAllStars}
            onAddProfile={doAddProfile}
            onSwitchProfile={doSwitchProfile}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>
      {portrait && <RotateOverlay />}
    </div>
  );
}
