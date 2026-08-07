import type { NodeId } from '../core/curriculum';
import type { Question } from '../core/questions';
import type { Star } from '../core/types';

// 屏幕状态机与练习会话镜像（App 持有，Practice/Result 消费）。
// 独立成模块以避免 App ↔ Practice 的运行时循环导入（同姊妹项目 session.ts）。

// M4 落地 profile/map/learn/practice/result 五屏；radar/launchpad/collection 是
// M5 的自由练习与图鉴屏，类型先占位，App 的 switch 到 M5 再接。
export type Screen =
  | 'profile'
  | 'map'
  | 'learn'
  | 'practice'
  | 'result'
  | 'radar'
  | 'launchpad'
  | 'collection';

export type Feedback = 'right' | 'wrong' | null;

// 会话真身是 App ref 里的 LessonSession（ref-truth，活在 Preact state 之外）；
// Session 只镜像渲染所需的最小字段。当前题在无反馈期恒等于 ls.current()，
// 反馈期则是「刚作答那道题」的快照——遮罩期间画面不许跳到下一题。
export interface Session {
  node: NodeId;
  practice: 1 | 2 | 3;   // 空间站会话无意义，恒传 1（见 lessonFlow.LessonMeta）
  station: boolean;
  qIndex: number;        // 镜像 LessonSession.index
  length: number;        // 镜像 .length——再见面插题会增长，进度轨每题重读
  total: number;         // 星级分母（计划题数，不含再见面）
  current: Question | null;
  feedback: Feedback;
  excluded: string[];    // 本题已排除的错误选项（blend：本段的）
  lastWrong?: string;    // 最近点错项——仅它在 wrong 反馈期抖动，旧排除项保持静止
  stage: number;         // blend 段游标（listen/tone 恒 0）
  docked: string[];      // blend 已对接的部件文本（按段序）
  resultStars?: Star;         // 结算星级（进结算前算定并落盘，供结算屏读取）
  resultUnlockedNext?: boolean; // 本次点亮是否推进了解锁链（结算屏「解锁新星球」横幅）
}
