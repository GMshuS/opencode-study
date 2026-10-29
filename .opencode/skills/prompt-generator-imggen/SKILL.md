---
name: prompt-generator-imggen
description: 当用户要求生成单张图片的提示词、优化提示词，或描述画面要求输出中英文正负提示词与推荐模型时调用。按固定结构拆解需求，输出单一 Markdown 结果，覆盖 Z-Image-Turbo、FLUX.2-klein、Krea2 Turbo、MOSS-Image SFT、qwen-image-2.1；三视图、四视图、角色或物体设定表不属于本技能
---

## 1. 技能定位
把用户自然语言拆成 8 段结构，输出中英双语正负提示词，并推荐模型与参数。仅处理单图的文生图、图生图、蒙版重绘；多视图 / 三视图 / 设定表类需求不适用。

本技能只做文本编排：不读取、不搜索图片文件，参考图由出图平台接收，提示词里只用文字引用。

## 2. 解析流程

### 2.1 模式识别（按顺序判定，命中即定）
1. 含「蒙版 / 局部修改 / 只改这块 / 把这部分换成」+ 指明修改区域 → `inpaint`
2. 含「参考图 / 保留原图 / 保持构图不变 / 用这张图改 / img2img」→ `img2img`
3. 仅「参考这张图的画风 / 类似风格」→ `txt2img`（画风参考不是 img2img，写入 style 字段）
4. 其它 → `txt2img`

### 2.2 拆解字段
1. subject 主体
2. pose_action 动作姿态
3. environment 环境背景
4. lighting 光线
5. camera 镜头参数
6. material 材质
7. style 画风
8. quality 画质细节

> - 顺序不可打乱；用户未提及的字段填「—」，不为凑格式硬加词
> - 用户明确不要的元素移入负面词
> - `img2img` / `inpaint` 不描述主体外观特征，也不编造图中没有的元素
> - 仅 MOSS-Image SFT 的版式场景额外产出 `layout`（画布比例 + 元素表：内容 / bbox / 样式）

### 2.3 模型推荐

| 需求特征 | 推荐模型 | 理由（写区分度，禁止写「快」） |
|---|---|---|
| 二次元 / 赛璐璐 / OC | Z-Image-Turbo | 二次元调度稳定 |
| 写实人像 / 原生肤质 / 单行短文字 | Z-Image-Turbo | 肤质自然、短文字准确 |
| 电影氛围 / 逆光 / 胶片 / 发丝飘动 / 情绪向 | Krea2 Turbo | 光影层次与材质表现 |
| 复杂构图 / 多物体 / 产品渲染 / 建筑原画 | FLUX.2-klein | 构图稳定，长 prompt 承载力强 |
| 国风 / 水墨 / 工笔 / 中文叙事 | qwen-image-2.1 | 中文语义与国风语料 |
| 参考图编辑 / 蒙版局部重绘 | FLUX.2-klein 或 qwen-image-2.1 | 两者都原生支持参考图与蒙版编辑；qwen 局部一致性更强 |
| 成段文字 / 海报版式 / 信息图 / UI / bbox 布局 | MOSS-Image SFT | bbox 布局可控，约 4K token |

冲突消解：
1. 命中 ≥2 类 → 首选 + 备选，理由写明取舍
2. 成段文字与参考图编辑互斥 → 分两步：先 MOSS 出图，再 img2img 精修
3. MOSS-Image 仅支持 t2i，`img2img` / `inpaint` 不选它
4. 用户指定模型 → 遵从，理由写「用户指定」

### 2.4 负面词包（直接取用，不自行发明）

| 场景 | 中文 | English |
|---|---|---|
| 人像写真 | 五官扭曲，多余手指，肢体畸形，过度磨皮，眼神空洞，比例失调，塑料皮肤，文字，水印 | distorted facial features, extra fingers, deformed limbs, over-smoothed skin, dead eyes, bad proportions, plastic skin, text, watermark |
| 商业产品渲染 | 形变，结构错误，多余部件，反光杂乱，阴影脏，文字，水印 | deformed shape, wrong structure, extra parts, messy reflections, dirty shadows, text, watermark |
| 国风水墨 | 西式画风，油画笔触，色彩艳俗，五官西化，构图杂乱，穿越感现代物件（手机、电线、霓虹灯） | western style, oil brushstrokes, garish colors, westernized faces, cluttered composition, anachronistic modern objects (phones, power lines, neon signs) |
| 版式文字（MOSS） | 乱码文字，字体重叠，文字溢出画面，版式错位，层级混乱 | garbled text, overlapping text, text overflow, misaligned layout, broken hierarchy |
| 通用兜底 | 畸变，模糊，噪点，低质量 | distortion, blurry, noise, low quality |

> - 通用兜底可叠加到任一场景
> - 版式文字场景**不加**「文字 / 水印」类词 —— 该场景正文本身就是要文字
> - 是否输出看 CFG：CFG=1 时负面词不参与计算，把排除项改写为正向「仅包含 Y」；CFG>1 时正常输出

### 2.5 参数基线（2026-10 快照 · 经验起始值）

| 模型 | 变体 | 支持模式 | steps | CFG | 分辨率 | denoise（i2i / inpaint） | 负面词有效度 |
|---|---|---|---|---|---|---|---|
| Z-Image-Turbo | turbo | t2i、i2i | 8~10 | 1.0 / 1.3~1.5 | 1024 起 | 0.6~0.7 / — | 低 |
| FLUX.2-klein | 蒸馏 | t2i、i2i、inpaint | 4~6 | 1.0 | ≤4MP | 0.55~0.7 / 0.75~0.9 | 低 |
| FLUX.2-klein | Base | t2i、i2i、inpaint | 20~28 | 3.5~4.0 | ≤4MP | 0.55~0.7 / 0.75~0.9 | 高 |
| Krea2 Turbo | turbo | t2i、i2i | 6~8 | 1.0 / 1.3~1.5 | 1024 起 | 0.6~0.7 / — | 低 |
| MOSS-Image | SFT | t2i | 25~30 | 4.0~5.0 | 512~2K 任意比例 | — | 高 |
| qwen-image-2.1 | — | t2i、i2i、inpaint | 20~30 | 2.5~4.0 | 1024 起 | 0.6~0.75 / 0.75~0.9 | 以管线为准 |

> - 变体必须注明：FLUX.2-klein（蒸馏 / Base）、MOSS-Image（SFT 出图 / Base 微调）
> - 分辨率须为 16 的倍数；MOSS 任意比例
> - Turbo 系无 Base 变体，提质量走二段采样：放大 1.5× + denoise 0.35~0.45；第二段 CFG 取 1.3~1.5 时负面词才生效
> - 官方可查：Z-Image `max_text_length` 512、FLUX.2 `max_sequence_length` 512、MOSS 约 4K token。其余为经验值，「负面词有效度」为经验判断，非厂商声明

## 3. 输出格式

```markdown
## 🎨 生图提示词结果
任务类型：{{task_type}}
✅ 推荐模型：{{recommend_model}}｜备选：{{alternative_model}}
理由：{{reason}}

---
### ✅ 正向提示词（中文）
{{mode_prefix_cn}}{{positive_cn}}{{mode_suffix_cn}}

### ✅ Positive Prompt (English)
{{mode_prefix_en}}{{positive_en}}{{mode_suffix_en}}

---
### ❌ 负面提示词（中文）
{{negative_cn}}

### ❌ Negative Prompt (English)
{{negative_en}}

---
### ⚙️ 参数建议
- 模型变体：{{model_variant}}
- 分辨率比例：{{resolution}}
- 重绘强度(denoising)：{{denoising_strength}}
- CFG：{{cfg_scale}}
- 采样步数：{{steps}}

### 📝 拆解明细
主体：{{subject}}
动作姿态：{{pose_action}}
环境背景：{{environment}}
光线：{{lighting}}
镜头参数：{{camera}}
材质：{{material}}
画风：{{style}}
画质细节：{{quality}}

### 🧩 版式布局（仅 MOSS-Image SFT）
画布：{{canvas}}

| 元素 | 内容 / 描述 | bbox (x1,y1,x2,y2) | 样式 |
|---|---|---|---|
| {{id}} | {{content}} | {{bbox}} | {{style}} |

### 💡 小贴士
{{tips}}
```

> 不适用的小节整节省略。`mode_prefix_*` / `mode_suffix_*` 按 §4 填入，`txt2img` 时四个槽位都留空。

## 4. 模式前缀

`txt2img` 不加前缀。`img2img` / `inpaint` 的前缀是**直接拼在正向提示词最前（和最后）的整句**，写入 §3 的 `{{mode_prefix_cn}}`、`{{mode_prefix_en}}`、`{{mode_suffix_cn}}`、`{{mode_suffix_en}}` 槽位。

### 4.1 `img2img`
- 中（`mode_prefix_cn`）：`保留原图的构图、主体位置、相机视角，只调整风格与色调，光源方向与原图一致，`
- 英（`mode_prefix_en`）：`Preserve the original composition, subject placement and camera angle; only change style and tone; keep the light direction consistent with the original image,`

> - 用户要换背景 / 换服装 / 换姿势时，把该项从「保留」改成具体要求（如「背景替换为纯白」）
> - denoise >0.6 时把「保留 / Preserve」改成「尽量保留 / Try to preserve」，否则画面会变形

示例（换背景）：`保留原图的构图、主体位置、相机视角，背景替换为纯白，光源方向与原图一致，` + 其余正向描述

### 4.2 `inpaint`
- 中（`mode_prefix_cn`，开头）：`画面其余元素、构图、光影、色调全部不变，仅修改指定区域；修改区域：`
- 中（`mode_suffix_cn`，结尾）：`光影与原图光源统一，边缘柔和自然，无缝融合，透视匹配原图`
- 英（`mode_prefix_en`，开头）：`All other elements, composition, lighting and tone remain unchanged; only the masked area is modified; Mask area:`
- 英（`mode_suffix_en`，结尾）：`light source consistent with the original image, soft natural edges, seamless blending, perspective matches the original`

## 5. 排版与长度约束

### 5.1 长度（只有上限，没有下限）
提示词长度是字段写完之后的结果，不是目标。**禁止为达到字数堆砌同义词**（如 beautiful, gorgeous, stunning 连用）。

| 模型 | token 上限（官方） | 建议上限（含前缀，超出则裁剪） |
|---|---|---|
| Z-Image-Turbo | 512（可调 1024） | 约 150 词 / 220 汉字 |
| Krea2 Turbo | 未公布 | 约 100 词 / 150 汉字 |
| FLUX.2-klein 蒸馏 | 512 | 约 80 词 / 120 汉字 |
| FLUX.2-klein Base | 512 | 约 150 词 / 220 汉字 |
| MOSS-Image SFT | 约 4K | 不限（分段组织，文案原样保留） |
| qwen-image-2.1 | 未公布 | 约 180 词 / 270 汉字 |

> 建议上限是「再写也不会更好」的拐点，不是配额；远低于上限完全正常，短而准优于长而全。

### 5.2 要素不完备时
主体、动作 / 姿态、场景 / 背景三项必须有值。缺则先追问；问不到按默认取值并在 tips 说明。**不得堆形容词补足。**

### 5.3 超上限裁剪顺序
先裁画质细节 → 材质 → 镜头参数；必须保留主体、版式、风格。裁掉的内容不转入负面词。

### 5.4 排版规则
1. 同分类 ≤3 个（颜色 / 材质 / 光影 / 镜头 / 风格 / 画质）
2. 中英一一对应，单条内不混排；型号、品牌名保留原文
3. 逗号分隔，不用多余换行
4. 不用 `(word:1.2)` 权重语法；强调改用语序前置或独立短句

## 6. 边界与失败模式
以上情形均在 tips 说明原因与替代建议：
1. 需求超出文生图 / 图生图 / 蒙版重绘（视频、3D、音频）→ 明确拒绝
2. 用户要求互斥风格 → 保留第一个，其余移入负面词
3. 信息不足 → 按 §5.2 追问或取默认，禁止编造与用户描述冲突的主体
4. 用户指定模型无法胜任（如 Z-Image 出成段文案）→ 遵从指定，给出更优备选

## 7. 输出前自检
1. `task_type` 符合 §2.1；「仅画风参考」未误判为 img2img
2. `img2img` / `inpaint` 的中英前缀齐全，已填入 `mode_prefix_cn/en`、`mode_suffix_cn/en`
3. 正负提示词中英一一对应，无混排
4. 参数与 §2.5 一致，已注明 FLUX.2-klein / MOSS-Image 变体；inpaint 用 inpaint 的 denoise
5. 长度（含前缀）未超 §5.1；超限已按 §5.3 裁剪；主体 / 动作 / 场景齐全，无为凑字数堆砌
6. MOSS 场景附 layout 表格；负面词按 CFG 规则输出
