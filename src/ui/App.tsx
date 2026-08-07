// 应用状态机 —— fork 自数学夜航 App.tsx 的核心 idiom：
//   - sessionRef/progressRef 镜像 ref：定时器/序列回调读最新值，不吃闭包旧值
//   - lessonRef（ref-truth）：LessonSession 活在 Preact state 之外，Session 只镜像渲染字段
//   - answer 双分支：答对 sfx+夸奖 clip+遮罩 1.1s 推进；答错排除+抖动、0.9s 清除原地重试
//   - blend 全段通过后播拼读序列（可长于 1.1s），护盾 held 到序列播完再推进（seqGen 守护）
//   - exitToMap teardown：clearTimer + stopVoice + 会话作废，杜绝离屏后定时器复活
import { useEffect, useRef, useState } from 'preact/hooks';
import { nodeToContent } from '../core/curriculum';
import type { Lesson, NodeId } from '../core/curriculum';
import { LessonSession } from '../core/lessonFlow';
import { launchpadUnlocked, planetOf, radarUnlocked } from '../core/progression';
import { buildPractice, buildStation } from '../core/questions';
import type { Question } from '../core/questions';
import { addProfile, defaultProgress, loadProgress, profileMeta, saveProgress, setActiveProfile } from '../core/storage';
import type { Progress } from '../core/types';
import { clipForLetter, clipForWholeRead } from '../audio/manifest';
import type { ClipId } from '../audio/manifest';
import { RIGHT_LINES, VOICE } from '../audio/lines';
import { playClip, playSeq, setClipVolume, stopVoice, warmLesson } from '../audio/voice';
import type { Screen, Session } from './session';
import { sfx } from './sound';
import { useStageScale } from './scale';
import { GalaxyMap } from './screens/GalaxyMap';
import { Learn } from './screens/Learn';
import { Practice } from './screens/Practice';
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

// 预热一轮练习会用到的 clips（题音 + blend 部件音 + 夸奖语），失败不响。
function warmQueue(queue: Question[]): void {
  const ids = new Set<ClipId>(RIGHT_LINES);
  for (const q of queue) {
    ids.add(clipOf(q));
    if (q.kind === 'blend') {
      if (q.target.initial !== '') ids.add(clipForLetter(q.target.initial));
      if (q.target.medial !== undefined) ids.add(clipForLetter(q.target.medial));
      ids.add(clipForLetter(q.target.final));
    }
  }
  warmLesson([...ids]);
}

export function App() {
  const [progress, setProgressState] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>('map');
  const [session, setSession] = useState<Session | null>(null);
  const [learnNode, setLearnNode] = useState<NodeId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scale = useStageScale();
  const portrait = usePortrait();

  // 选人屏（多档案）：≥2 档案且本次会话未选过 → 启动先选人。
  // 选同一档案直接进入；选其他档案切 active 后整页重载（干净重置全部会话态）。
  const [needPick, setNeedPick] = useState(
    () => profileMeta().count > 1 && !globalThis.sessionStorage?.getItem('pp_profile_picked'),
  );
  const pickProfile = (i: number) => {
    try { globalThis.sessionStorage?.setItem('pp_profile_picked', '1'); } catch { /* 私密模式 */ }
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
    try { globalThis.sessionStorage?.removeItem('pp_profile_picked'); } catch { /* 私密模式 */ }
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
  // 拼读序列的时代计数：exitToMap/重开会话时 ++，令在途 playSeq().then 安静放弃。
  const seqGenRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };
  useEffect(() => () => clearTimer(), []);

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
    updateProgress(next);
    lessonRef.current = null; // 已结算，杜绝二次 commit
    sfx.chord();
    const lines: ClipId[] = [stars >= 3 ? VOICE.star1 : VOICE.star2];
    if (unlockedNext) lines.push(VOICE.unlockPlanet);
    if (radarNew) lines.push(VOICE.unlockRadar); // M5 屏未接，但解锁时刻属于本次结算
    if (launchNew) lines.push(VOICE.unlockLaunch);
    seqGenRef.current++;
    void playSeq(lines);
    setSession({ ...s, feedback: null, resultStars: stars, resultUnlockedNext: unlockedNext });
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
    const parts: ClipId[] = [];
    if (q.target.initial !== '') parts.push(clipForLetter(q.target.initial));
    if (q.target.medial !== undefined) parts.push(clipForLetter(q.target.medial));
    parts.push(clipForLetter(q.target.final), clipOf(q));
    const gen = ++seqGenRef.current;
    void playSeq(parts).then(() => {
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
    const d = defaultProgress();
    setClipVolume(d.settings.clipVolume);
    updateProgress(d);
    setSettingsOpen(false);
    setSession(null);
    setLearnNode(null);
    setScreen('map');
  };
  const unlockAll = () => {
    updateProgress({ ...progressRef.current, unlocked: 15 });
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
            onOpenSettings={() => setSettingsOpen(true)}
          />
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
            onRetry={retrySession}
            onBackToMap={exitToMap}
          />
        )}
        {settingsOpen && (
          <SettingsModal
            settings={progress.settings}
            onUpdateSettings={updateSettings}
            onResetProgress={resetProgress}
            onUnlockAll={unlockAll}
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
