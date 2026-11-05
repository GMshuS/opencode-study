---
name: prompt-generator-structure
description: 当用户需要生成骨骼关键点图、LineArt 干净线稿或 Canny 硬边缘线稿的提示词时调用。覆盖文生图与参考图图生图两种模式，按任务类型与主体类别拼装「固定基础段 + 分类切换片段」，输出中英提示词、负面词、参数建议与避坑提示。
---

## 1. 定位与边界

产出的是**控制图提示词**（用于控姿势 / 控外形），由通用扩散模型以文生图、图生图模式出图：Flux2 / Krea2 / Qwen-Image-2.1 / Z-Image。**不是** ComfyUI 的 DW-Pose / Canny 预处理器，也不产出预处理器参数。

本技能只做文本编排：不读取图片文件，参考图由出图平台接收，提示词里只用文字引用。

> 核心结构是 **固定基础段 + 分类切换片段**：基础段全程不变，只换末尾一小句。用词固定，不来回换同义词。

## 2. 输入判定（三个维度，分别命中即定）

### 2.1 任务

| 任务 | 适用 |
|---|---|
| 骨骼关键点图 `skeleton` | 控姿势，用于后续姿态绑定 |
| 干净线稿 `lineart` | 手绘感轮廓稿，控外形 |
| 硬边缘线稿 `canny` | 锐利工业硬边，适合产品、建筑 |

> `lineart` 与 `canny` 二选一：想要手绘感用 `lineart`，想要锐利硬边工业稿用 `canny`。

### 2.2 模式

- 有参考图 → `i2i`（图生图，提取原图姿态 / 轮廓）
- 无参考图、凭文字定姿势 / 造型 → `t2i`（文生图，直接产出控制图）

### 2.3 主体类别（决定切换片段）

- 骨骼：真人 / 动漫人物 / 四足动物 / 奇幻生物
- 线稿：真人 / 动漫人物 / 动物 / 静物产品道具 / 建筑场景
- `canny` 无切换片段

### 2.4 语言与模型

| 模型 | 用哪套模板 |
|---|---|
| Qwen-Image-2.1 / Z-Image | 中文模板更省心 |
| Flux2 / Krea2 | 英文模板，效果普遍优于中文 |

输出时中英两套都给并标注适用模型，用户按平台取用。

## 3. 模板

### 3.1 骨骼关键点图 · `i2i`

固定基础段：

- 中：`根据参考图提取姿态，生成骨架关键点图，关节点连线，白底，不渲染主体形象，无颜色、无纹理、无多余线条`
- 英：`extract pose from reference image, skeleton keypoint map, connected joints, solid white background, do not render the subject, no color, no texture, no extra messy lines`

分类切换片段：

| 主体类别 | 中文 | English |
|---|---|---|
| 真人 | `标准OpenPose人体关键点，包含手指关键点` | `standard openpose human keypoints, include hand landmarks` |
| 动漫人物 | `匹配原图动漫头身比例的肢体骨架，不要强行改成真人比例` | `match original anime body proportion, do not force real human proportion` |
| 四足动物 | `动物四肢骨骼，不要套用人体OpenPose骨架，保留尾巴关键点` | `animal limb skeleton, do not use human openpose keypoints, include tail keypoints` |
| 奇幻生物 / 怪兽 | `生物肢体骨架，按原图肢体结构打点连线，不要拟人化人体骨架` | `creature limb skeleton, keypoints follow original body structure, no anthropomorphic human skeleton` |

### 3.2 骨骼关键点图 · `t2i`

固定基础段（去掉「根据参考图提取姿态」）：

- 中：`生成骨架关键点图，关节点连线，白底，不渲染主体形象，无颜色无纹理`
- 英：`skeleton keypoint map, connected joints, solid white background, do not render subject, no color, no texture`

末尾追加用户给的姿势 / 造型描述，如 `女生全身抬手姿势`、`匹配Q版动漫头身比，蹲姿骨架` / `full body girl raising hand`。

### 3.3 干净线稿 · `i2i`

固定基础段：

- 中：`根据参考图提取轮廓，干净线稿，黑色轮廓线，白底，无填充颜色，没有明暗阴影，线条流畅，无多余杂线`
- 英：`clean line art from reference image, black outline, solid white background, no fill color, no shading, smooth lines, no messy strokes`

分类切换片段：

| 主体类别 | 中文 | English |
|---|---|---|
| 真人 | `保留真实人体结构与衣物褶皱，不要卡通变形` | `keep realistic human structure and clothing folds, do not cartoon distort` |
| 动漫人物 | `保留原图二次元比例与造型，不要写实化` | `preserve original anime proportion and shape, do not photorealistic` |
| 动物 | `保留动物外形轮廓，不要拟人化，不要添加人脸五官` | `keep animal contour, avoid anthropomorphism, no extra human facial features` |
| 静物 / 产品 / 道具 | `只保留外形结构线，不要五官、表情、生物特征` | `only structural outline, no face, no facial features, no biological details` |
| 建筑 / 场景 | `建筑结构线稿，保留门窗墙体轮廓，无环境光影` | `architectural sketch, keep wall and window outline, no environmental lighting` |

### 3.4 干净线稿 · `t2i`

固定基础段：

- 中：`干净线稿，黑色轮廓线，白底，无填充颜色，没有明暗阴影，线条流畅，无多余杂线`
- 英：`clean line art, black outline, solid white background, no fill color, no shading, smooth lines, no messy strokes`

末尾追加用户给的造型描述，如 `古风少女站姿，二次元造型` / `ancient style girl standing, anime style`。

### 3.5 硬边缘线稿 `canny`

- 中：`根据参考图提取边缘，Canny边缘图，细黑色边缘线，白底，无填充，无阴影，只保留结构边界，线条硬朗`
- 英：`canny edge map from reference image, thin black edge lines, solid white background, no fill, no shading, only structural boundaries, hard edges`

> 仅支持 `i2i`（基础段含「根据参考图提取边缘」）；无参考图时改用 `lineart` 的 `t2i` 模板，并在 tips 说明。

### 3.6 组装规则

1. `固定基础段` + `分类切换片段` + （`t2i` 时的姿势 / 造型描述），用逗号拼成**一整句**，不分段、不用分号。
2. 基础段与切换片段**原样取用**，不改写、不同义替换；固定写法：`白底` = `solid white background`、`黑色轮廓线` = `black outline`、`无填充`、`无明暗阴影`、`线条流畅`、`无杂线`。
3. 中英各自成句，一一对应，单句内不混排。
4. **骨骼图禁止追加任何画风词**（厚涂、写实、二次元插画等）。

## 4. 负面词（固定一套，直接取用）

- 中文：`色彩，上色，光影，渐变，材质，照片，渲染，模糊，杂乱背景，多余元素，水印，文字`
- English: `color, painted, shading, gradient, texture, photo, render, blurry, cluttered background, extra elements, watermark, text`

是否输出按 `CFG` 判定：

| `CFG` | 处理 |
|---|---|
| `= 1`（Turbo / 蒸馏变体，如 Qwen-Image-2.1 Turbo） | 负面词不参与计算，两节**整节省略**，直接忽略 |
| `> 1` | 正常输出两节 |

## 5. 参数建议

| 项 | 取值 |
|---|---|
| 图生图重绘幅度 `denoise` | `0.2–0.4` |
| 模型变体 | 注明 Turbo / 蒸馏 / Base；Turbo 系 CFG 恒为 1 |
| 参考图比例 | 尽量与生成尺寸一致，防止拉伸变形 |

显存 → 尺寸映射（骨骼 / 线稿不需要大图）：

| 显存 | 推荐尺寸 |
|---|---|
| 4G~6G | 512×512 / 512×768 / 768×512 |
| 8G | 768×768 / 768×1024 |
| 12G 及以上 | 1024×1024（上限，不建议更大） |

尺寸须为 16 的倍数。

## 6. 输出格式

```markdown
## 🦴 结构图提示词结果
任务：{{task}}｜模式：{{mode}}｜主体类别：{{category}}
✅ 推荐模型：{{model}}（{{language}} 模板）

---
### ✅ 提示词（中文）
{{prompt_cn}}

### ✅ Prompt (English)
{{prompt_en}}

---
### ❌ 负面提示词（中文）
{{negative_cn}}

### ❌ Negative Prompt (English)
{{negative_en}}

---
### ⚙️ 参数建议
- 模型变体：{{model_variant}}
- 重绘强度(denoising)：{{denoise}}
- CFG：{{cfg}}
- 分辨率：{{resolution}}

### 💡 避坑提示
{{tips}}
```

> `CFG=1` 时负面词两节整节省略；`t2i` 时 `denoise` 一栏写 `—`。

## 7. 边界与避坑

以下写入 `tips`：

1. 骨骼图加了画风词极易直接画出人物而不是骨架（§3.6）。
2. 大模型转动物姿态天生不如人体稳定；要求极高姿态精度时改用专用 pose 检测器。
3. `lineart` 与 `canny` 二选一，不要混用两套基础段。
4. 导出后预览检查：骨骼看关键点有没有缺手指；线稿看有没有偷偷带上阴影和颜色。
5. 语言按 §2.4 选，不要在同一条里中英混排。
6. 本技能不产出 ComfyUI 预处理器参数，也不处理成品插画的提示词。

## 8. 输出前自检

1. 任务 / 模式 / 主体类别 / 语言四项判定齐全，模板取用正确
2. 基础段原样未改写，切换片段与主体类别匹配，整句拼接无分号分层
3. `CFG=1` 时负面词两节已省略；参数与 §5 一致，`i2i` 的 `denoise` 在 0.2–0.4
4. 骨骼图无画风词，中英各自成句无混排，避坑提示已写入 tips
