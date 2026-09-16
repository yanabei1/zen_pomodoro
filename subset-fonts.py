#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
禅意番茄钟 · 思源宋体子集化脚本
================================================================
把 24MB 的完整思源宋体，裁成「这个应用真正会显示的字」，
输出 woff2。两个文件合计从 47MB 降到几百 KB。

为什么要子集化：
  思源宋体 SC 含 6 万多个汉字，而本应用界面文案一共只用几百个字。
  完整字库对 PWA 首屏是不可接受的负担，尤其在移动网络上。

依赖（已装在工作区内的隔离目录，不污染系统 Python）：
  python -m pip install --target ../.tools/pylibs --no-index ^
      --find-links ../.tools/wheels fonttools brotli

用法：
  set PYTHONPATH=..\.tools\pylibs
  python subset-fonts.py

改动文案后请重新运行本脚本，否则新字会掉回系统宋体。
脚本会同时打印字符总量，方便确认没有漏收。
================================================================
"""

import io
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
# 完整字库放在上一级（不随应用部署，否则白搭 47MB 上去）
FONT_DIR = os.path.join(os.path.dirname(HERE))     # 源：完整 OTF
OUT_DIR = os.path.join(HERE, "fonts")              # 产物：子集 woff2

# 界面文案所在文件 —— 从中提取所有会显示出来的汉字
TEXT_SOURCES = ["index.html", "app.js", "manifest.json", "styles.css"]

WEIGHTS = [
    ("SourceHanSerifSC-Regular.otf", "SourceHanSerifSC-Regular.woff2"),
    ("SourceHanSerifSC-Bold.otf", "SourceHanSerifSC-Bold.woff2"),
]

# ---------------------------------------------------------------
# 1. 必备字符区间
#    这些和文案无关，是排版与运行时必然会用到的，必须无条件保留。
# ---------------------------------------------------------------
RANGES = [
    "U+0020-007E",   # 基本拉丁：数字、英文字母、常用标点（时间、版本号、英文界面）
    "U+00A0-00FF",   # 拉丁补充：° 等
    "U+2010-2027",   # 连字符、各类破折号、引号 —— 文案里的「——」在这里
    "U+2030-205E",   # 更多标点
    "U+20A0-20BF",   # 货币符号（未用，代价极低，防止将来加）
    "U+2100-214F",   # 字母式符号
    "U+2190-21FF",   # 箭头 ← → （同步说明里可能用）
    "U+2200-22FF",   # 数学运算符
    "U+25A0-25FF",   # 几何图形 ■ ● （轮次圆点若改用文字符号）
    "U+2600-26FF",   # 杂项符号
    "U+3000-303F",   # CJK 标点：。、「」（）《》· —— 中文文案的重灾区
    "U+FF00-FFEF",   # 全角形式：，：（）！？ —— 全角标点
]

# 单独点名保留的字符：文案里真实出现、但不在上面区间内的
EXTRA = [
    "∞",   # 禅意模式（专注时长 = 无限）
    "〇",   # 中文数字零（cnNum 用于日期）
    "—",   # 破折号（统计页日期区间）
    "·",   # 间隔号（标题「禅 · 番茄钟」）
    "…",   # 省略号
    "，", "。", "、", "：", "；", "！", "？",
    "（", "）", "「」", "《》", "“”", "‘’",
]

# ---------------------------------------------------------------
# 2. 从源码里提取所有汉字
# ---------------------------------------------------------------
CJK = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")


def collect_text_chars():
    """扫描文案源文件，取出其中出现的每一个字符（不是只取汉字 ——
       全取一遍最稳妥，标点和英文符号也不会漏）。"""
    chars = set()
    missing = []
    for name in TEXT_SOURCES:
        path = os.path.join(HERE, name)
        if not os.path.exists(path):
            missing.append(name)
            continue
        with io.open(path, encoding="utf-8") as f:
            chars |= set(f.read())
    if missing:
        print("  ! 未找到（跳过）:", ", ".join(missing))
    return chars


def build_charset():
    chars = set(EXTRA)
    chars |= collect_text_chars()

    # 运行时会动态拼出来的内容，源码里没有字面量，必须手工补：
    chars |= set("0123456789")                      # 时间、分钟数、版本号
    chars |= set("一二三四五六七八九十〇")            # cnNum() 生成的中文数字
    chars |= set("月日星期")                          # fmtDate() / fmtRange()
    chars |= set("小时分个天轮第共计约")              # 时长与统计文案里拼的单位
    chars |= set("分钟")                              # valText() 的「25 分钟」
    chars |= set("abcdefghijklmnopqrstuvwxyz")
    chars |= set("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    # 英文界面全套，防止漏在字母表外
    chars |= set("hHmMsS./:·—()[]∞")

    # 丢掉不可打印字符（换行、制表符、BOM 等），它们不需要字形
    chars = {c for c in chars if c.isprintable() and not c.isspace()}
    return chars


def main():
    try:
        from fontTools import subset
    except ImportError:
        print("缺少 fonttools。请先运行：")
        print("  python -m pip install --target ..\\.tools\\pylibs --no-index "
              "--find-links ..\\.tools\\wheels fonttools brotli")
        return 1

    charset = build_charset()
    cjk = sorted(c for c in charset if CJK.match(c))
    print("字符集：合计 %d 个（其中汉字 %d 个）" % (len(charset), len(cjk)))
    print("汉字清单：%s" % "".join(cjk))
    print()

    os.makedirs(OUT_DIR, exist_ok=True)
    text = "".join(sorted(charset))

    for src_name, out_name in WEIGHTS:
        src = os.path.join(FONT_DIR, src_name)
        if not os.path.exists(src):
            print("! 源字体不存在:", src)
            return 1
        out = os.path.join(OUT_DIR, out_name)

        args = [
            src,
            "--output-file=" + out,
            "--flavor=woff2",              # 浏览器原生支持的压缩格式
            "--text=" + text,              # 只保留这些字符的字形
            "--unicodes=" + ",".join(RANGES),
            "--layout-features=*",         # 保留 kern / locl 等排版特性
            "--name-IDs=*",                # 保留字体名，CSS 里 font-family 才能对上
            "--drop-tables+=DSIG",         # 签名表对网页字体无用
            "--recalc-bounds",
            "--no-hinting",                # CFF 无线条微调，去掉可再省一点
            "--desubroutinize",            # 去掉 CFF 子程序，避免个别浏览器解析异常
        ]
        print("子集化 %s ..." % src_name)
        subset.main(args)

        before = os.path.getsize(src)
        after = os.path.getsize(out)
        print("  → %-34s %6.0f KB  (原 %5.1f MB，缩到 %.1f%%)"
              % (out_name, after / 1024.0, before / 1048576.0,
                 after * 100.0 / before))
    print("\n完成。若改动了界面文案，请重新运行本脚本。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
