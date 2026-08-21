#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""本地 OCR 文本提取脚本。

将图片通过本地 OCR 引擎识别为文字，并按 block->line 重建版面结构（markdown），
便于纯文本大模型基于文本理解图片内容。

后端自动探测（最轻量优先）：
    1. tesseract CLI
    2. pytesseract (Python，仍依赖 tesseract 二进制)
    3. easyocr (torch)
    4. paddleocr (torch)

用法:
    python3 ocr_extract.py <图片路径|目录> [--lang chi_sim+eng] [--out 文件]
"""

import argparse
import os
import subprocess
import sys
import tempfile


DEFAULT_LANG = "chi_sim+eng"


def _which(cmd):
    from shutil import which

    return which(cmd) is not None


def _has(module):
    try:
        __import__(module)
        return True
    except Exception:
        return False


def backend_tesseract_cli(lang):
    return _which("tesseract")


def backend_pytesseract(lang):
    return _has("pytesseract") and _which("tesseract")


def backend_easyocr(lang):
    return _has("easyocr")


def backend_paddleocr(lang):
    return _has("paddleocr")


BACKENDS = [
    ("tesseract-cli", backend_tesseract_cli),
    ("pytesseract", backend_pytesseract),
    ("easyocr", backend_easyocr),
    ("paddleocr", backend_paddleocr),
]


def pick_backend(lang):
    for name, checker in BACKENDS:
        try:
            if checker(lang):
                return name
        except Exception:
            continue
    return None


def install_hint():
    return (
        "未检测到任何可用的 OCR 后端。请安装其中之一（按轻量优先）：\n"
        "  [Linux/WSL]   sudo apt-get install tesseract-ocr tesseract-ocr-chi-sim\n"
        "  [Windows]     winget install UBManheim.TesseractOCR\n"
        "                (中文包: 下载 chi_sim.traineddata 放入 tessdata 目录)\n"
        "  [macOS]       brew install tesseract tesseract-lang\n"
        "  [Python 备选] pip install easyocr   (或 paddleocr，依赖 torch，体积较大)\n"
        "安装后确保 `tesseract` 在 PATH 中，且已包含 chi_sim 语言包。"
    )


def _needs_chi_sim(lang):
    return "chi_sim" in lang


def lang_pack_hint():
    return (
        "缺少中文语言包 chi_sim。请安装：\n"
        "  [Linux/WSL]   sudo apt-get install tesseract-ocr-chi-sim\n"
        "  [macOS]       brew install tesseract-lang\n"
        "  [手动]        下载 https://github.com/tesseract-ocr/tessdata/blob/main/chi_sim.traineddata\n"
        "                放入 tesseract 的 tessdata 目录。"
    )


def ocr_tesseract_cli(image_path, lang):
    with tempfile.TemporaryDirectory() as td:
        out_base = os.path.join(td, "ocr")
        cmd = ["tesseract", image_path, out_base, "-l", lang, "--psm", "6"]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            # 可能是缺语言包，给出提示
            if _needs_chi_sim(lang) and (
                "chi_sim" in proc.stderr or "lang" in proc.stderr.lower()
            ):
                sys.stderr.write(lang_pack_hint() + "\n")
            else:
                sys.stderr.write(proc.stderr)
            return None
        txt_path = out_base + ".txt"
        if not os.path.exists(txt_path):
            return None
        with open(txt_path, "r", encoding="utf-8") as f:
            return f.read()


def ocr_pytesseract(image_path, lang):
    import pytesseract
    from PIL import Image

    img = Image.open(image_path)
    data = pytesseract.image_to_data(
        img, lang=lang, output_type=pytesseract.Output.DICT, config="--psm 6"
    )
    return _rebuild_layout(data)


def _rebuild_layout(data):
    """根据词级坐标按 block->line 重建版面，输出带结构的文本。"""
    n = len(data.get("text", []))
    if n == 0:
        return ""
    rows = []
    for i in range(n):
        t = (data["text"][i] or "").strip()
        if not t:
            continue
        rows.append(
            {
                "block": data["block_num"][i],
                "par": data["par_num"][i],
                "line": data["line_num"][i],
                "top": data["top"][i],
                "left": data["left"][i],
                "w": data["width"][i],
                "text": t,
            }
        )
    if not rows:
        return ""

    # 按 block、行 top、左坐标排序
    rows.sort(key=lambda r: (r["block"], r["top"], r["left"]))

    # 分组为 (block, line) 的行
    lines = {}
    for r in rows:
        key = (r["block"], r["top"])
        lines.setdefault(key, []).append(r)

    out_lines = []
    last_block = None
    for key in sorted(lines.keys(), key=lambda k: (k[0], k[1])):
        block, top = key
        words = sorted(lines[key], key=lambda r: r["left"])
        line_text = " ".join(w["text"] for w in words)
        if block != last_block and last_block is not None:
            out_lines.append("")  # 块之间空行
        out_lines.append(line_text)
        last_block = block
    return "\n".join(out_lines)


def ocr_easyocr(image_path, lang):
    import easyocr

    # easyocr 语言名用小写: ch_sim, en
    lang_list = []
    for part in lang.split("+"):
        if part == "chi_sim":
            lang_list.append("ch_sim")
        elif part == "eng":
            lang_list.append("en")
        else:
            lang_list.append(part)
    if not lang_list:
        lang_list = ["ch_sim", "en"]
    reader = easyocr.Reader(lang_list, gpu=False)
    results = reader.readtext(image_path, detail=1)
    # results: (bbox, text, conf) 按阅读顺序大致返回
    return "\n".join(txt for _, txt, _ in results)


def ocr_paddleocr(image_path, lang):
    from paddleocr import PaddleOCR

    # paddleocr lang 参数: 'ch' 中英文混合, 'en' 英文
    use_lang = "ch" if _needs_chi_sim(lang) else "en"
    ocr = PaddleOCR(use_angle_cls=True, lang=use_lang, show_log=False)
    result = ocr.ocr(image_path, cls=True)
    lines = []
    if result and result[0]:
        for line in result[0]:
            # line: [bbox, (text, conf)]
            lines.append(line[1][0])
    return "\n".join(lines)


OCR_FUNCS = {
    "tesseract-cli": ocr_tesseract_cli,
    "pytesseract": ocr_pytesseract,
    "easyocr": ocr_easyocr,
    "paddleocr": ocr_paddleocr,
}


def process_image(image_path, lang):
    backend = pick_backend(lang)
    if backend is None:
        sys.stderr.write(install_hint() + "\n")
        return None, None
    func = OCR_FUNCS[backend]
    try:
        text = func(image_path, lang)
    except Exception as e:  # pragma: no cover - 运行期错误透出
        sys.stderr.write(f"[{backend}] 识别失败: {e}\n")
        # 尝试退回下一个可用后端
        fallback = None
        for name, checker in BACKENDS:
            if name == backend:
                continue
            try:
                if checker(lang):
                    fallback = name
                    break
            except Exception:
                continue
        if fallback:
            sys.stderr.write(f"尝试回退后端: {fallback}\n")
            try:
                text = OCR_FUNCS[fallback](image_path, lang)
                return text, fallback
            except Exception as e2:
                sys.stderr.write(f"[{fallback}] 也失败: {e2}\n")
                return None, None
        return None, None
    return text, backend


def list_images(path):
    if os.path.isfile(path):
        return [path]
    if os.path.isdir(path):
        exts = (".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp")
        files = []
        for f in sorted(os.listdir(path)):
            if f.lower().endswith(exts):
                files.append(os.path.join(path, f))
        return files
    return []


def main():
    ap = argparse.ArgumentParser(description="本地 OCR 图片转文本（含版面结构）")
    ap.add_argument("path", help="图片路径或包含图片的目录")
    ap.add_argument("--lang", default=DEFAULT_LANG, help=f"语言包，默认 {DEFAULT_LANG}")
    ap.add_argument("--out", default=None, help="将结果写入文件而非仅 stdout")
    args = ap.parse_args()

    images = list_images(args.path)
    if not images:
        sys.stderr.write(f"未找到图片: {args.path}\n")
        sys.exit(2)

    blocks = []
    for img in images:
        text, backend = process_image(img, args.lang)
        if text is None:
            blocks.append(f"## {os.path.basename(img)}\n[OCR 失败]\n")
            continue
        header = f"## {os.path.basename(img)}"
        if backend:
            header += f"  (backend: {backend})"
        blocks.append(f"{header}\n\n{text}\n")

    result = "\n---\n\n".join(blocks)

    if args.out:
        out_dir = os.path.dirname(args.out)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(result)
        print(f"已写入: {args.out}")
    else:
        print("# OCR 提取结果\n")
        print(result)


if __name__ == "__main__":
    main()
