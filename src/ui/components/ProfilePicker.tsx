// 选人屏 —— fork 自数学夜航 ProfilePicker（多档案，≥2 档案时启动展示）。
// 头像 = 三色小火箭（代码画 SVG）；无文字输入——6 岁孩子认颜色和进度数字比认名字可靠。
import { peekProfile, profileMeta } from '../../core/storage';

const LABELS = ['一号宇航员', '二号宇航员', '三号宇航员'];
const SUIT = [
  { hull: '#FF8FB3', fin: '#E8618C' },
  { hull: '#5BC8F5', fin: '#2E9FD8' },
  { hull: '#59DDA9', fin: '#2FB183' },
];

function RocketAvatar({ i }: { i: number }) {
  const c = SUIT[i % SUIT.length];
  return (
    <svg width="96" height="120" viewBox="0 0 96 120" aria-hidden="true">
      <path d="M48 6 C66 24 72 48 72 68 L24 68 C24 48 30 24 48 6 Z" fill={c.hull} stroke="#FFF" stroke-width="4" />
      <circle cx="48" cy="44" r="12" fill="#8FD6FF" stroke="#FFF" stroke-width="4" />
      <path d="M24 62 L8 86 L28 80 Z" fill={c.fin} />
      <path d="M72 62 L88 86 L68 80 Z" fill={c.fin} />
      <path d="M40 84 C44 96 52 96 56 84 C54 104 42 104 40 84 Z" fill="#FFB84D" />
    </svg>
  );
}

export function ProfilePicker({ onPick }: { onPick: (i: number) => void }) {
  const { count } = profileMeta();
  return (
    <div class="pp-profile">
      <div class="pp-profile-title">今天谁来拼音星球？</div>
      <div class="pp-profile-cards">
        {Array.from({ length: count }, (_, i) => {
          const peek = peekProfile(i);
          return (
            <button key={i} class="pp-profile-card" onClick={() => onPick(i)}>
              <RocketAvatar i={i} />
              <div class="pp-profile-name">{LABELS[i]}</div>
              <div class="pp-profile-sub">
                {peek ? `第 ${peek.unlocked} 站 · ★ ${peek.stars}` : '新宇航员'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
