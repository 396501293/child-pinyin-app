// 语音播放器：预生成 mp3 → 单一共享 AudioContext（全应用唯一有状态音频模块）。
// iOS 铁律：ctx 必须在首次用户手势里 resume（initVoice 注册一次性 pointerdown），
// 解锁后定时器驱动的自动播放才合法；不裸用 <audio>.play()。
// 任一 clip 失败（fetch/decode/ctx 不可用）：静默降级 Web Speech 念 say 文本。
import { clipInfo, type ClipId } from './manifest';
import { initTTS, speak, stopTTS, ttsAvailable } from './tts';
import { LruCache } from './lru';

/** 纯函数（可测）：clip 文件 → 部署路径下的 URL。 */
export const clipUrl = (baseUrl: string, file: string): string => `${baseUrl}audio/${file}`;

let ctx: AudioContext | null = null;
const buffers = new LruCache<ClipId, AudioBuffer>(80); // 80 × ~0.3MB PCM ≈ 25MB 上限
const inflight = new Map<ClipId, Promise<AudioBuffer>>(); // play/warm 并发去重
let current: AudioBufferSourceNode | null = null;
let generation = 0; // stopVoice/interrupt 递增，令在途 playSeq 安静退出

function ac(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null; // 无 WebAudio 环境（旧 WebView/测试）：交给 Web Speech 降级
  }
}

/** App 启动时调用一次：注册一次性 pointerdown 解锁 + 回前台重 resume。 */
export function initVoice(): void {
  initTTS(); // 降级通道同时就绪
  document.addEventListener('pointerdown', () => ac(), { once: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ctx?.state === 'suspended') void ctx.resume();
  });
}

async function load(id: ClipId): Promise<AudioBuffer> {
  const cached = buffers.get(id);
  if (cached) return cached;
  const pending = inflight.get(id);
  if (pending) return pending;
  const c = ac();
  if (!c) throw new Error('voice: no AudioContext');
  const p = (async () => {
    const res = await fetch(clipUrl(import.meta.env.BASE_URL, clipInfo(id).file));
    if (!res.ok) throw new Error(`voice: fetch ${id} -> ${res.status}`);
    const buf = await c.decodeAudioData(await res.arrayBuffer());
    buffers.set(id, buf);
    return buf;
  })().finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

/** 播放一个 clip，播完 resolve；失败静默降级 say（此时立即 resolve，不精确等语音）。
 *  默认打断在播内容——「至多一个音源」不靠 UI 自觉；序列内部才传 interrupt:false。 */
export async function playClip(id: ClipId, opts: { interrupt?: boolean } = {}): Promise<void> {
  const info = clipInfo(id); // 未知 id 在此就地爆炸（守卫钉死），不进静默降级
  if (opts.interrupt ?? true) stopVoice();
  const gen = generation;
  try {
    const buf = await load(id);
    const c = ac()!; // load 成功即 ctx 存在
    if (c.state === 'suspended') {
      // iOS 上非手势栈内 resume() 可能永远 pending：限时等待，超时按锁定处理走降级
      await Promise.race([c.resume(), new Promise((r) => setTimeout(r, 1500))]);
    }
    if (c.state !== 'running') throw new Error('voice: AudioContext locked');
    if (gen !== generation) return; // 等待期间被打断：安静放弃
    await new Promise<void>((resolve) => {
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.onended = () => {
        if (current === src) current = null;
        resolve();
      };
      current = src;
      src.start();
    });
  } catch {
    if (gen === generation) say(info.say);
  }
}

/** 顺序播放（教拼读：[sm-b, ym-a, sy-ba4] → “b — a — bà”）；被 stopVoice 打断即止。 */
export async function playSeq(ids: ClipId[], gapMs = 250): Promise<void> {
  stopVoice(); // 接管音源，序列内不再各自打断
  const gen = generation;
  for (const [i, id] of ids.entries()) {
    if (gen !== generation) return;
    await playClip(id, { interrupt: false });
    if (i < ids.length - 1 && gapMs > 0) {
      await new Promise((r) => setTimeout(r, gapMs));
    }
  }
}

/** 停掉当前音源与在途序列（含 Web Speech 队列）。 */
export function stopVoice(): void {
  generation++;
  current?.stop();
  current = null;
  stopTTS();
}

/** 预热本课 clips（fetch+decode 进 LRU）；失败不响——真播时自会降级。 */
export function warmLesson(clipIds: ClipId[]): void {
  for (const id of clipIds) void load(id).catch(() => {});
}

export const voiceAvailable = (): boolean =>
  typeof AudioContext !== 'undefined' || ttsAvailable();

/** Web Speech 降级通道：clip 管线失败时念载字/台词。 */
function say(text: string): void {
  speak(text, { interrupt: true });
}
