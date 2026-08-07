// 台词 id 的类型化清单（M4+ 的 UI 只经此引用台词，不裸写字符串）。
// satisfies 保证每个值都是 audio-script.json 里真实存在的 clip id（编译期），
// tests/audio/manifest.test.ts 守卫 (d) 再双向核对一遍（运行期数据）。
import type { ClipId } from './manifest';

export const VOICE = {
  welcome: 'ln-welcome', //         欢迎来到拼音星球！
  gameListen: 'ln-game-listen', //  练1：听一听，选出你听到的拼音。
  gameTone: 'ln-game-tone', //      练2：听一听，这是第几声？
  gameBlend: 'ln-game-blend', //    练3：听一听，把飞船舱对接成这个音节。
  right1: 'ln-right1', //           答对啦！
  right2: 'ln-right2', //           真棒！
  right3: 'ln-right3', //           你真厉害！
  retry: 'ln-retry', //             再试一次！
  star1: 'ln-star1', //             太棒了！
  star2: 'ln-star2', //             拿到星星啦！
  unlockPlanet: 'ln-unlock-planet', // 新星球解锁啦！
  unlockRadar: 'ln-unlock-radar', //   聪耳雷达开放啦！
  unlockLaunch: 'ln-unlock-launch', // 拼读发射台开放啦！
  station: 'ln-station', //         欢迎来到空间站，我们一起复习吧！
  bye: 'ln-bye', //                 今天玩得真开心，下次再来哦！
} as const satisfies Record<string, ClipId>;

export type VoiceLineId = (typeof VOICE)[keyof typeof VOICE];

/** 答对随机夸奖池（UI 轮换用）。 */
export const RIGHT_LINES: readonly VoiceLineId[] = [VOICE.right1, VOICE.right2, VOICE.right3];
