---
name: image-ocr-extract
description: 当需要将图片（截图、文档扫描、白底文字图等）转为文本供纯文本大模型分析时调用。通过本地 OCR 识别图片中的文字并重建版面结构，让不支持多模态的纯文本模型也能"读懂"图片内容。
---

# 本地 OCR 图片转文本 Skill

很多纯文本大模型不支持多模态，无法直接解析图片。本 skill 通过**本地 OCR**
把图片识别为文字、并按版面结构还原，使纯文本模型可以基于提取出的文本来理解图片。

## 适用场景

- 用户要求「识别/读取/提取/转写这张图（片）」「把图里的字读出来」
- 用户附带图片，但当前模型无法解析图片（纯文本模型）
- 图片为截图、文档扫描、表格、白底黑字等以文字为主的图片

## 不适用 / 局限

- OCR 只提取**文字与大致版面**，**无法理解颜色、图表含义、手写体语义**
- 对纯图表、流程图、人脸/风景等无文字或文字极少的图片效果差
- 识别准确率依赖图片清晰度与字体；模糊/艺术字可能出错

## 工作流程

1. **确定图片路径**
   - 用户直接给出路径，或会话附带图片被自动保存到项目的image-ocr-extract目录中（如 `./image-ocr-extract/images/xxx.png`）。
   - 若用户给的是目录，脚本会批量处理其中所有图片。

2. **运行 OCR 脚本**
   在 skill 目录下执行（请替换为实际绝对路径）：

   ```bash
   python3 <skill_dir>/assets/ocr_extract.py "<图片路径>" --lang chi_sim+eng
   ```

   - 默认语言 `chi_sim+eng`（中英），可用 `--lang` 调整（如仅 `eng`）。
   - 结果过长时可用 `--out ./image-ocr-extract/output/xxx.png.md` 落盘，避免刷屏。
   - 支持后端自动探测，优先顺序：tesseract CLI → pytesseract → easyocr → paddleocr（最轻量优先）。无需手动指定后端。

3. **读取提取结果**
   - 脚本输出以 `## <文件名>` 分隔的多张图片文本，内含按 block/line 重建的段落与换行（markdown）。
   - 将这份「文本+版面」**当作该图片的可读内容**用于后续分析。

4. **基于文本作答**
   - 像处理一段普通文本一样，对提取内容做总结、检索、翻译、问答等。
   - 若 OCR 结果明显残缺（如乱码、缺行），向用户说明并建议提供更清晰的图片。

## 环境准备（首次使用）

当前脚本优先使用 `tesseract`。若未安装会输出安装指引，常见方式：

- **Linux / WSL**：`sudo apt-get install tesseract-ocr tesseract-ocr-chi-sim`
- **Windows**：`winget install UBManheim.TesseractOCR`（中文包放入 tessdata）
- **macOS**：`brew install tesseract tesseract-lang`
- **Python 备选**：`pip install easyocr`（或 `paddleocr`，依赖 torch，体积大）

安装后确保 `tesseract` 在 PATH 中，且包含 `chi_sim` 语言包（脚本在缺包时会提示）。

## 输出示例

```
# OCR 提取结果

## screenshot.png  (backend: tesseract-cli)

登录失败处理流程
1. 校验用户名密码
2. 连续失败 5 次锁定账号
3. 发送告警通知

---
```
