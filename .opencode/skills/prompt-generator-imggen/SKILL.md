---
name: prompt-generator-imggen
description: 当用户要求生成图片提示词、优化提示词，或描述画面要求输出中英文正负提示词与推荐模型时调用。按固定结构拆解需求，输出单一 Markdown 结果，覆盖 Z-Image-Turbo、FLUX.2-klein、Krea2 Turbo、MOSS-Image SFT、qwen-image-2.1
---

## 1. 技能定位
把用户自然语言拆成 8 段结构，输出中英双语正负提示词，并推荐模型与参数。仅处理单图的文生图、图生图、蒙版重绘；多视图 / 三视图 / 设定表类需求不适用。

## 2. 解析流程

### 2.1 模式识别（按顺序判定，命中即定）
1. 含「蒙版 / 局部修改 / 只改这块」→ `inpaint`
2. 含「参考图 / 保留原图 / 保持构图不变 / img2img」→ `img2img`
3. 其它 → `txt2img`

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
> - 仅 MOSS-Image SFT 的版式场景额外产出 `layout`（画布比例 + 元素表格：内容 / bbox / 样式），其它模型不输出

### 2.3 模型推荐

| 需求特征 | 推荐模型 | 理由 |
|---|---|---|
| 写实人像、商业写真、原生肤质、中文人像、快速草稿、单行中英文短文字 | Z-Image-Turbo | 8 步出图，写实质感自然、短文字准确 |
| 复杂构图、产品渲染、三视图线稿、多物体、工业设定、建筑原画、参考图语义编辑 | FLUX.2-klein | 构图稳定，长提示词承载力强，原生支持参考图编辑 |
| 电影氛围、动态、发丝飘动、水雾黄昏、逆光、胶片质感、情绪向审美 | Krea2 Turbo | 光影与氛围表现突出，成片风格强 |
| 成段文案、海报版式、信息图、UI 稿、多语言文字、bbox 精确布局、超长提示词 | MOSS-Image SFT | 布局可控，支持约 4K token，文字与排版分组最优 |
| 国风、水墨工笔、中文叙事、自然语言编辑、诗意画面 | qwen-image-2.1 | 中文语义理解强，国风表现力优秀 |

冲突消解（按顺序判定，命中即定）：
1. 成段文字 / 多行排版 / 版式位置可控 → MOSS-Image SFT
2. 参考图 / 保留原图 / 物体替换或移除 → FLUX.2-klein；`inpaint` 只能给它
3. 氛围光影 vs 写实人像 → 人像为主体取 Z-Image-Turbo，氛围为主体取 Krea2 Turbo；国风 vs 复杂构图 → qwen-image-2.1 首选、FLUX.2-klein 备选
4. 跨 2 类以上 → 输出首选 + 备选，理由写明取舍

### 2.4 负面词包（直接取用，不自行发明）

| 品类 | 中文 | English |
|---|---|---|
| 人像写真 | 五官扭曲，多余手指，肢体畸形，过度磨皮，眼神空洞，比例失调，塑料皮肤 | distorted facial features, extra fingers, deformed limbs, over-smoothed skin, dead eyes, bad proportions, plastic skin |
| 商业产品渲染 | 形变，结构错误，多余部件，反光杂乱，阴影脏，文字，水印 | deformed shape, wrong structure, extra parts, messy reflections, dirty shadows, text, watermark |
| 线稿正交图 | 透视，分栏错位，画面融合，线条毛躁，多余结构，比例不一致 | perspective, misaligned panels, merged panels, messy lines, extra structure, inconsistent proportions |
| 国风水墨 | 西式画风，油画笔触，色彩艳俗，五官西化，构图杂乱，现代元素 | western style, oil brushstrokes, garish colors, westernized faces, cluttered composition, modern elements |
| Krea2 Turbo 氛围（≤6） | 五官崩坏，肢体畸形，色彩断层，过曝，死黑，文字水印 | broken face, deformed limbs, color banding, blown highlights, crushed blacks, text watermark |
| MOSS 版式文字 | 乱码文字，错字，缺字，字体重叠，文字溢出画面，版式错位，层级混乱 | garbled text, misspelled text, missing characters, overlapping text, text overflow, misaligned layout, broken hierarchy |
| 通用精简 | 畸变，模糊，噪点，文字，水印，低质量 | distortion, blurry, noise, text, watermark, low quality |

按模型决定是否输出负面词：FLUX.2-klein 与 MOSS-Image SFT 输出完整负面；Z-Image-Turbo 与 Krea2 Turbo 在 CFG≈1 时负面词无效，排除项改写为正向「仅包含 Y」，仅 CFG>1.2 时输出 ≤6 项；qwen-image-2.1 以管线为准，不支持时并入正向限定。

### 2.5 参数基线（2026-10 快照，起始值）

| 模型 | 支持模式 | steps | CFG | 分辨率 | 负面词有效度 |
|---|---|---|---|---|---|
| Z-Image-Turbo | t2i、i2i（弱） | 8~10 | 1.0~1.5 | 1024×1024 / 16:9 | 低 |
| FLUX.2-klein | t2i、i2i、inpaint | 4~6（蒸馏）/ 20~28（Base） | 1.0（蒸馏）/ 3.5~4.0（Base） | ≤4MP | 中高 |
| Krea2 Turbo | t2i、i2i | 6~8 | 1.0~1.5 | 1024×1024 | 中 |
| MOSS-Image SFT | t2i | 25~30 | 4.0~5.0 | 512~2K 任意比例 | 高 |
| qwen-image-2.1 | t2i、i2i | 20~30 | 2.5~4.0 | 1024×1024 | 以管线为准 |

> FLUX.2-klein 必须注明变体（蒸馏 / Base），两者步数差 4 倍以上。量化版与采样器差异需实测。

## 3. 输出格式

```markdown
## 🎨 生图提示词结果
任务类型：{{task_type}}
✅ 推荐模型：{{recommend_model}}｜备选：{{alternative_model}}
理由：{{reason}}

---
### ✅ 正向提示词（中文）
{{positive_cn}}

### ✅ Positive Prompt (English)
{{positive_en}}

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

> 不适用的小节（负面提示词、版式布局）整节省略，不留空标题。理由栏写推荐依据；用户指定模型写「用户指定」，旧代号写「已映射」。

## 4. 模式强制前缀（中英成对添加）
1. `txt2img`：无前缀
2. `img2img`：
   中：`严格保留原图构图、物体位置、相机视角不变，只修改风格与色调，光源方向和原图保持一致，`
   英：`Strictly preserve the original composition, object placement and camera angle; only change style and color tone; keep the light direction consistent with the original image,`
3. `inpaint`：
   中（开头）：`画面其余所有元素、构图、人物、光影、色调全部保持不变，仅修改蒙版选中区域；蒙版区域：`
   英（开头）：`All other elements, composition, character, lighting and tone remain unchanged; only the masked area is modified; Mask area:`
   中（结尾）：`光影与原图光源统一，边缘柔和自然，无缝融合，透视匹配原图`
   英（结尾）：`light source consistent with the original image, soft natural edges, seamless blending, perspective matches the original`

## 5. 排版与长度约束
1. 同分类关键词不超过 3 个（MOSS 版式场景中的文案内容不计入配额）
2. 中英语义一一对应，单条提示词内不混排；镜头参数、型号、品牌名保留原文
3. 逗号分隔，不用多余换行
4. 不使用 `(word:1.2)` 权重语法（新模型多按字面量处理，会污染画面）
5. 正向词长度：

| 模型 | 预算 |
|---|---|
| Z-Image-Turbo | ≤60 词，文字仅限单行短句 |
| FLUX.2-klein | ≤150 词 |
| Krea2 Turbo | ≤80 词 |
| MOSS-Image SFT | 分段组织，可至 4K token；文案原样保留 |
| qwen-image-2.1 | ≤150 词 |

## 6. 边界与失败模式
以上情形均在 tips 说明原因与替代建议：
1. 需求超出文生图 / 图生图 / 蒙版重绘（视频、3D、音频）→ 明确拒绝，不硬凑
2. 用户要求互斥风格 → 保留第一个，其余移入负面词
3. 信息不足 → 可合理补词，但禁止编造与用户描述冲突的主体或场景
4. 用户指定模型无法胜任（如要求 Z-Image-Turbo 出成段文案）→ 遵从指定，给出更优备选

## 7. 输出前自检
1. `task_type` 符合 §2.1 判定顺序
2. `inpaint` / `img2img` 的中英双向前缀齐全（§4）
3. 正负提示词中英一一对应，无违规混排
4. 参数与 §2.5 一致，FLUX.2-klein 已注明变体
5. 长度符合 §5 预算；MOSS 场景附 layout 表格，其它模型不输出该节

---
