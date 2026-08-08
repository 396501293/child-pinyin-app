let voice: SpeechSynthesisVoice | null = null;

// 可用性变化订阅者：voiceschanged 后重挑声音并广播。fork 自数学夜航（那边 App 用它给
// 🔊 图标置灰）；本项目发音走预生成 mp3 clip，不依赖 Web Speech 可用性，App 未接线——
// 见下方 onAvailabilityChange。
const availabilityListeners = new Set<() => void>();

function pickVoice(): void {
  const list = speechSynthesis.getVoices();
  voice = list.find(v => v.lang.startsWith('zh') && v.localService)
       ?? list.find(v => v.lang.startsWith('zh')) ?? null;
  availabilityListeners.forEach(fn => fn());
}

export function initTTS(): void {
  if (!('speechSynthesis' in globalThis)) { return; }
  pickVoice();
  speechSynthesis.addEventListener('voiceschanged', pickVoice); // iOS 首次列表为空
}

export const ttsAvailable = (): boolean => !!voice;

// 订阅可用性变化，返回取消订阅函数——未被使用的 fork 遗留导出（App 无调用点），
// 保留只为与姊妹项目（数学夜航）API 对齐。
export function onAvailabilityChange(fn: () => void): () => void {
  availabilityListeners.add(fn);
  return () => { availabilityListeners.delete(fn); };
}

export function speak(text: string, opts: { interrupt?: boolean } = {}): void {
  if (!voice) return;                                  // 静默降级
  if (opts.interrupt) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice; u.lang = voice.lang; u.rate = 0.9;
  speechSynthesis.speak(u);
}

export const stopTTS = (): void => { if ('speechSynthesis' in globalThis) speechSynthesis.cancel(); };
