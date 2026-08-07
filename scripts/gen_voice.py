#!/usr/bin/env python3
"""gen-voice.sh 的实现体：读 src/data/audio-script.json，用 edge-tts 生成 mp3。

- 正式音   → public/audio/<file>           （提交入库，应用只用这批）
- 候选音   → scripts/audio-qa/<stem>.candN.mp3（gitignore，仅听审对比用；
             不能放 public/——Vite 会整目录拷进 dist 并被 PWA 预缓存）
- 听审页   → scripts/qa-listen.html         （file:// 打开，分组列出全部 clip）

跳过条件 = 文件已存在 且 sidecar 状态（scripts/audio-qa/.texts.json，记录
filename→已生成的 text+voice）与当前一致：听审后改了 say/voice 重跑会精准重生成，
不会「跳过并沿用旧录音」。已有文件而无状态记录时视为与当前文本一致（首跑自举；
正确性由「改 say 必然发生在有状态之后」的工作流保证）。--force 无条件全量重生成；
--only <前缀> 过滤 clip id。临时写 .tmp 再改名，中断不会留下半截 mp3。
瞬时失败重试 3 次；默认直连，末次重试改走 http(s)_proxy 环境变量（若有）。
任一 clip 失败则退出码非 0。
"""

import argparse
import asyncio
import html
import json
import os
import random
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
SCRIPT_JSON = ROOT / "src" / "data" / "audio-script.json"
AUDIO_DIR = ROOT / "public" / "audio"
QA_DIR = ROOT / "scripts" / "audio-qa"
QA_HTML = ROOT / "scripts" / "qa-listen.html"
STATE_FILE = QA_DIR / ".texts.json"  # filename→{text,voice}；gitignore（随 audio-qa/）
CONCURRENCY = 4  # 对非官方端点客气一点，防限流
ATTEMPTS = 3

GROUPS = [
    ("sm-", "声母（呼读音，《汉语拼音方案》注音字）"),
    ("ym-", "韵母（呼读音）"),
    ("tv-", "带调元音（L1-2 练2：a o e i u ü × 1-4 声）"),
    ("sy-", "音节（课程 blends + toneSets×4，载字来自课程表）"),
    ("zt-", "整体认读（citation）"),
    ("ln-", "台词"),
]


def env_proxy():
    for key in ("https_proxy", "HTTPS_PROXY", "http_proxy", "HTTP_PROXY"):
        value = os.environ.get(key)
        if value and value.startswith("http"):
            return value
    return None


async def gen_take(sem, voice, text, path, force, stats, state):
    """生成单条音频；文件已存在且记录的 text+voice 未变则跳过（无记录视为未变，自举）。"""
    expected = {"text": text, "voice": voice}
    if path.exists() and not force:
        previous = state.get(path.name)
        if previous is None or previous == expected:
            state[path.name] = expected
            stats["skipped"] += 1
            return
    async with sem:
        last_error = None
        for attempt in range(1, ATTEMPTS + 1):
            # 直连已验证可用；仅末次重试尝试走代理（网络环境变化时的后备）。
            proxy = env_proxy() if attempt == ATTEMPTS else None
            tmp = path.with_suffix(".tmp")
            try:
                await edge_tts.Communicate(text, voice, proxy=proxy).save(str(tmp))
                if tmp.stat().st_size == 0:
                    raise RuntimeError("empty output")
                tmp.replace(path)
                state[path.name] = expected
                stats["generated"] += 1
                return
            except Exception as error:  # noqa: BLE001 —— 端点异常种类不可枚举
                last_error = error
                tmp.unlink(missing_ok=True)
                if attempt < ATTEMPTS:
                    await asyncio.sleep(1.5 * attempt + random.random())
        stats["failed"].append((path.name, f"{type(last_error).__name__}: {last_error}"))


def stem(clip):
    return clip["file"].removesuffix(".mp3")


def build_qa_html(clips):
    """生成听审页：分组正式音 + 候选对比区。纯静态，file:// 可开。"""

    def audio(src):
        return f'<audio controls preload="none" src="{src}"></audio>'

    def rows(items):
        out = []
        for clip_id, clip in items:
            cand_mark = " ★有候选" if clip.get("candidates") else ""
            out.append(
                f"<tr><td><code>{clip_id}</code>{cand_mark}</td>"
                f"<td class='say'>{html.escape(clip['say'])}</td>"
                f"<td>{audio('../public/audio/' + clip['file'])}</td></tr>"
            )
        return "\n".join(out)

    sections = []
    for prefix, title in GROUPS:
        items = [(k, v) for k, v in clips.items() if k.startswith(prefix)]
        sections.append(
            f"<section><h2>{title}（{len(items)}）</h2>"
            f"<table><tr><th>clip</th><th>say</th><th>试听</th></tr>{rows(items)}</table></section>"
        )

    cand_rows = []
    for clip_id, clip in clips.items():
        candidates = clip.get("candidates")
        if not candidates:
            continue
        takes = "".join(
            f"<div class='cand{' pick' if text == clip['say'] else ''}'>"
            f"<span>{index}. {html.escape(text)}{'（当前 say）' if text == clip['say'] else ''}</span>"
            f"{audio(f'audio-qa/{stem(clip)}.cand{index}.mp3')}</div>"
            for index, text in enumerate(candidates, 1)
        )
        cand_rows.append(
            f"<tr><td><code>{clip_id}</code></td>"
            f"<td class='say'>{html.escape(clip['say'])}</td>"
            f"<td>{audio('../public/audio/' + clip['file'])}</td>"
            f"<td>{takes}</td></tr>"
        )
    sections.append(
        "<section><h2>候选对比（人耳挑选后把胜者写回 audio-script.json 的 say，"
        f"再 --force --only 重生成该 clip）（{len(cand_rows)}）</h2>"
        "<table><tr><th>clip</th><th>当前 say</th><th>正式音</th><th>候选</th></tr>"
        + "".join(cand_rows)
        + "</table></section>"
    )

    body = "\n".join(sections)
    QA_HTML.write_text(
        f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>拼音星球 · 语音听审</title>
<style>
  body {{ font-family: system-ui, sans-serif; margin: 2rem; max-width: 72rem; }}
  h2 {{ margin-top: 2.5rem; border-bottom: 2px solid #4FA8F0; padding-bottom: .3rem; }}
  table {{ border-collapse: collapse; width: 100%; }}
  td, th {{ border: 1px solid #ddd; padding: .35rem .6rem; text-align: left; }}
  td.say {{ font-size: 1.4rem; }}
  audio {{ height: 2rem; vertical-align: middle; }}
  .cand {{ margin: .15rem 0; display: flex; gap: .5rem; align-items: center; }}
  .cand.pick span {{ font-weight: bold; color: #1a7f37; }}
</style></head><body>
<h1>拼音星球 · 语音听审（{sum(1 for _ in clips)} clips）</h1>
<p>由 scripts/gen-voice.sh 生成。重点听「★有候选」和候选对比区；正式音全部过一遍耳朵。</p>
{body}
</body></html>
""",
        encoding="utf-8",
    )


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="忽略已存在文件，全量重生成")
    parser.add_argument("--only", metavar="前缀", default="", help="只处理 id 以该前缀开头的 clip")
    args = parser.parse_args()

    doc = json.loads(SCRIPT_JSON.read_text(encoding="utf-8"))
    voice = doc["voice"]
    clips = doc["clips"]
    selected = {k: v for k, v in clips.items() if k.startswith(args.only)}
    if not selected:
        print(f"⚠ --only '{args.only}' 未匹配任何 clip", file=sys.stderr)
        sys.exit(1)

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    QA_DIR.mkdir(parents=True, exist_ok=True)
    for leftover in (*AUDIO_DIR.glob("*.tmp"), *QA_DIR.glob("*.tmp")):
        leftover.unlink()  # 上次中断的残留
    try:
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        state = {}

    sem = asyncio.Semaphore(CONCURRENCY)
    stats = {"generated": 0, "skipped": 0, "failed": []}
    tasks = []
    for clip in selected.values():
        tasks.append(
            gen_take(sem, voice, clip["say"], AUDIO_DIR / clip["file"], args.force, stats, state)
        )
        for index, text in enumerate(clip.get("candidates", []), 1):
            qa_path = QA_DIR / f"{stem(clip)}.cand{index}.mp3"
            tasks.append(gen_take(sem, voice, text, qa_path, args.force, stats, state))
    await asyncio.gather(*tasks)

    STATE_FILE.write_text(
        json.dumps(state, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8"
    )
    build_qa_html(clips)  # 听审页始终全量重建（含未选中的 clip，页面才完整）

    total_bytes = sum(f.stat().st_size for f in AUDIO_DIR.glob("*.mp3"))
    print(
        f"clips {len(selected)}/{len(clips)} 选中；生成 {stats['generated']}，"
        f"跳过 {stats['skipped']}，失败 {len(stats['failed'])}；"
        f"public/audio 共 {sum(1 for _ in AUDIO_DIR.glob('*.mp3'))} 个 mp3，"
        f"{total_bytes / 1024 / 1024:.2f} MB；听审页 {QA_HTML.relative_to(ROOT)}"
    )
    if stats["failed"]:
        for name, error in stats["failed"]:
            print(f"  ✗ {name}: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
