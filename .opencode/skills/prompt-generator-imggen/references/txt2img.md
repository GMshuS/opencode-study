# txt2img 拆解结构

## 1. 三类结构（顺序不可打乱）

按 **风格 → 主体 → 场景** 组织，正向提示词也按此顺序拼接。风格前置是全局任务声明，先定「这是什么图」，再定对象与呈现。

| 类 | 包含 | 说明 |
|---|---|---|
| 1. 风格 style | **画面类型 / 媒介**：写实人像、动漫二次元、商业产品渲染、海报版式、UI、3D 渲染<br>**画风 / 美学**：胶片、赛璐璐、极简、国风水墨；配色、色调、氛围也归此层 | 两层分列，先写类型再写画风；借用某图的画风 / 配色 / 氛围均写入此层；画面类型可直接命中主文件 §2.3 模型推荐 |
| 2. 主体 subject | 主体类别与数量、外观特征（形貌 / 配色 / 服饰）、主体材质、动作姿态与表情、画面文字内容 | 外观与动作合并 |
| 3. 场景 scene | **环境 + 光线**：环境背景、光线、色调氛围<br>**镜头 + 构图**：景别、视角、焦距、景深、构图 | 分两个子组，组内从整体到细节 |

## 2. 组装规则

- 三类顺序不可打乱，类内按「整体 → 细节」排列。
- **段内逗号、段间分号**（主文件 §4.1）：`风格，…；主体，…；场景，…`。中文全角 `；`，英文半角 `; `，中英分号数量相等。
- 材质归属：主体自身材质归 subject，环境材质归 scene，同一材质只写一次。
- 画质词（高清 / 8K / masterpiece 等）不单独成字段、不默认输出；仅用户明确要求时写一个短语，且不得与其它修饰重复。
- 用户未提及的项在「📝 拆解明细」中记 `—`，提示词正文里直接省略，不补默认值、不凑词。
- 用户明确不要的元素按主文件 §2.4 归入负面词（CFG=1 时改为正向排除句）。
- 强调靠语序前置或独立短句，不用权重语法。

### 示例

```text
写实人像摄影，胶片质感；一位银发女性，米白色针织衫，侧身回望，发丝微动；午后窗边，侧逆光，50mm 视角，浅景深
Photorealistic portrait, film grain; a silver-haired woman, cream knit sweater, looking back over her shoulder, hair slightly moving; by a window in the afternoon, side backlight, 50mm lens, shallow depth of field
```

## 3. 要素完备性

- 主体（版式场景则为文字内容）与场景至少各有一条可观察描述；动作姿态仅当画面有动态时写。
- 确实缺失才追问；问不到按默认取值并在 tips 说明，**不得堆形容词补足**。
- 静物、风景、抽象纹理、纯版式等无明确动作的需求，不补动作。

## 4. 版式文字场景（MOSS-Image SFT）

在场景类之外额外产出 `layout`，作为附加槽位：画布比例 + 元素表（内容 / bbox / 样式）。填入主文件 §3 的「🧩 版式布局」小节。

- 文案原样保留，不改写、不翻译、不截断；文案内自带标点不算结构分隔符。
- 版式文案中的文字是画面内容，不是提示词修饰词，不参与裁剪。

## 5. 负面词包（按风格取）

两层可叠加：**画面类型 → 基础包** + **画风 → 追加包** + 通用兜底。只在主文件 §2.4 判定 `CFG>1` 时输出。

| 维度 | 取值 | 中文 | English |
|---|---|---|---|
| 画面类型 → 基础包 | 写实人像 | 五官扭曲，多余手指，肢体畸形，过度磨皮，眼神空洞，比例失调，塑料皮肤，文字，水印 | distorted facial features, extra fingers, deformed limbs, over-smoothed skin, dead eyes, bad proportions, plastic skin, text, watermark |
| | 动漫二次元 | 角色长相不一致，线稿错乱，多余手指，肢体畸形，背景杂乱，文字，水印 | inconsistent character appearance, broken lineart, extra fingers, deformed limbs, cluttered background, text, watermark |
| | 商业产品渲染 | 形变，结构错误，多余部件，反光杂乱，阴影脏，文字，水印 | deformed shape, wrong structure, extra parts, messy reflections, dirty shadows, text, watermark |
| | 版式文字 / UI | 乱码文字，字体重叠，文字溢出画面，版式错位，层级混乱 | garbled text, overlapping text, text overflow, misaligned layout, broken hierarchy |
| | 3D 渲染 | 贴图错位，法线错误，多边形破面，材质穿模，阴影断裂 | misplaced textures, flipped normals, broken polygons, material clipping, broken shadows |
| 画风 → 追加包 | 国风水墨 | 西式画风，油画笔触，色彩艳俗，五官西化，构图杂乱，穿越感现代物件（手机、电线、霓虹灯） | western style, oil brushstrokes, garish colors, westernized faces, cluttered composition, anachronistic modern objects (phones, power lines, neon signs) |
| | 胶片 / 写实摄影 | 数码塑料感，过度锐化，HDR 光晕 | digital plastic look, over-sharpening, HDR halos |
| 通用兜底 | — | 畸变，模糊，噪点，低质量 | distortion, blurry, noise, low quality |

> - 直接取用，不自行发明；用户明确排除的元素可追加，须在 tips 标注「用户指定」。
> - 版式文字 / UI 场景**不加**「文字 / 水印」类词 —— 该场景正文本身就是要文字。
> - 通用兜底可叠加到任一组合；未命中任何风格包时只用通用兜底。
> - 动漫二次元、3D 渲染、胶片三行为经验补充词包，非厂商声明，按实际平台效果调整。
> - `CFG=1` 时本表整体不输出，处理见主文件 §2.4。

## 6. 输出补充

- 正向提示词从正文起头，**无锚点句与融合句**；主文件 §3 模板不设前后缀槽位。
- 填「📝 拆解明细」三行：风格 / 主体 / 场景；不填「📝 编辑明细」。
- 参数建议照主文件 §2.5 填写，`denoise` 一栏在 `txt2img` 下写 `—`。
