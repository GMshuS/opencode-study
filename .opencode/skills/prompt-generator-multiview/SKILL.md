---
name: prompt-generator-multiview
description: 当用户需要三视图、四视图、角色设定表或物体设定表时调用；解析多视图生图需求，输出中英正向、中英负面提示词、推荐模型、生成参数、显存适配尺寸、参考图绑定约束；支持真人人像、动漫角色、产品物体，区分txt2img文生图、img2img参考图生图模式；普通单图提示词不属于本技能
---
## 1. 技能定位
把三视图 / 四视图设定表需求拆成 9 段结构，输出中英双语正负提示词、推荐模型与参数。仅处理多视图设定表（三/四视图、角色或物体设定图）；单图普通生图、蒙版局部重绘不适用。

本技能只做文本编排：**不读取、不搜索图片文件**。参考图由出图平台接收，提示词里只用文字引用它。

## 2. 解析流程

### 2.1 模式识别（按顺序判定，命中即定）
1. 含「蒙版 / 局部修改 / 只改这块」→ 本技能不适用
2. 含「用这张图画 / 保持这个人物 / 依据图片 / 图片1 / img2img / 以这张图为准」→ `img2img`
3. 仅「参考这张图的画风 / 类似风格」→ `txt2img`（画风参考不是 img2img，写入 style 字段）
4. 其它 → `txt2img`

### 2.2 拆解字段
1. subject 主体（`txt2img` 写关键特征；`img2img` 见 §4）
2. pose_action 动作姿态（固定 T-pose，标准站立；禁止动态姿势）
3. layout 排版布局（三视图 / 四视图；独立分栏；分割线；横向排布；画面不重叠；物体额外增加正交视图）
4. environment 环境背景（纯白 / 浅灰；写实真人与产品默认纯白，动漫人设默认浅灰）
5. lighting 光线（均匀柔光，全场光影一致）
6. camera 镜头参数（全身完整入镜）
7. material 材质（人物写肤质 / 服饰材质；物体写外壳、漆面、塑料金属；无则填「—」）
8. style 画风（写实摄影 / 赛璐璐平涂原画 / 工业工程参考图）
9. quality 画质细节（高清，轮廓清晰，资产设定图，构图干净）

> - 顺序不可打乱；用户缺失的字段用内置标准词补齐（与单图技能「填 —」不同，设定表需要完整骨架）
> - `img2img` 不写具体外观属性值，外观由参考图决定；但【必须】写主体类别词（如「二次元动漫少女」「不锈钢水壶」），否则参考图含多主体时指向不明
> - `img2img` 允许「属性项 + 与参考图一致」写法；用户显式要求改某项外观时走 §4.4
> - 物体分支强制追加「正交视图，无透视」，人像禁止该词
> - 用户明确排除的效果移入负面词

### 2.3 模型推荐

| 需求特征 | 推荐模型 | 理由（写区分度，禁止写「快」） |
|---|---|---|
| 中文自然语言描述、分栏语义理解 | qwen-image-2.1 | 中文语义理解最强 |
| 二次元 OC / 动漫角色设定表 / 赛璐璐 | Z-Image-Turbo | 二次元画风调度稳定 |
| 物体 / 产品 / 工业正交三视图 | FLUX.2-klein | 结构稳定、几何一致 |
| 真人 img2img、参考图编辑 | FLUX.2-klein | 参考图编辑原生（锁 ID 仍靠 IP-Adapter 等外部组件） |
| 需要 bbox 分栏定位、带标注文字 | MOSS-Image SFT | bbox 布局可控（仅 t2i） |

> 混合需求输出首选 + 备选；用户指定模型则遵从，理由写「用户指定模型」。

### 2.4 负面词包（直接取用，不自行发明）

| 场景 | 中文 | English |
|---|---|---|
| 人像多视图 | 肢体畸形，五官扭曲，手指错乱，画面互相融合重叠，不同人物，多余人物，动态姿势，透视混乱，文字，水印，logo | deformed limbs, distorted facial features, malformed fingers, merged panels, different people, extra people, dynamic pose, broken perspective, text, watermark, logo |
| 动漫人设 sheet | 角色长相不一致，分栏画面融合，肢体崩坏，多余肢体，多余人物，扭曲变形，文字，水印，杂乱背景 | inconsistent character appearance, merged panels, broken limbs, extra limbs, extra people, distortion, text, watermark, cluttered background |
| 工业正交物体 | 透视畸变，画面重叠，物体变形，多余部件，阴影杂乱，文字，水印，环境杂物 | perspective distortion, overlapping panels, object deformation, extra parts, messy shadow, text, watermark, miscellaneous objects |

> - 按 CFG 决定是否输出：CFG=1 时负面词不参与计算，把排除项改写为正向「仅包含 Y」；CFG>1 时正常输出
> - 单图多主体时追加「多余人物，多个主体」/ `extra people, multiple subjects`

### 2.5 参数基线（2026-10 快照 · 经验起始值）

| 模型 | 变体 | denoise（i2i） | steps | CFG | 负面词有效度 |
|---|---|---|---|---|---|
| qwen-image-2.1 | — | 0.6~0.75 | 20~30 | 2.5~4.0 | 以管线为准 |
| Krea2 Turbo | turbo | 0.6~0.7 | 6~8 | 1.0 / 1.3~1.5 | 低 |
| FLUX.2-klein | 蒸馏 | 0.55~0.7 | 4~6 | 1.0 | 低 |
| FLUX.2-klein | Base | 0.55~0.7 | 20~28 | 3.5~4.0 | 高 |
| Z-Image-Turbo | turbo | 0.6~0.7 | 8~10 | 1.0 / 1.3~1.5 | 低 |
| MOSS-Image | SFT | —（仅 t2i） | 25~30 | 4.0~5.0 | 高 |

> - 变体必须注明：FLUX.2-klein（蒸馏 / Base）、MOSS-Image（SFT 出图 / Base 微调）
> - 官方可查：Z-Image `max_text_length` 512、FLUX.2 `max_sequence_length` 512、MOSS 约 4K token。其余为经验值

## 3. 输出格式

```markdown
## 🎨 三视图/四视图设定表 提示词结果
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
- 重绘强度(denoising)：{{denoising_strength}}
- CFG：{{cfg_scale}}
- 采样步数：{{steps}}
- 分辨率 & 显存：{{resolution}}

### 📝 拆解明细
主体：{{subject}}
动作姿态：{{pose_action}}
排版布局：{{layout}}
环境背景：{{environment}}
光线：{{lighting}}
镜头参数：{{camera}}
材质：{{material}}
画风：{{style}}
画质细节：{{quality}}

### 🔗 参考图绑定说明（仅 img2img）
{{ref_binding_note}}

### 💡 小贴士
{{tips}}
```

> 不适用的小节整节省略。理由栏写推荐依据；用户指定模型写「用户指定」。

## 4. 参考图绑定（仅 img2img）

`txt2img` 不加。`img2img` 的绑定语句就是正向第一句，取代主体描述。

前提：参考图按顺序传入，平台指代可区分（图1 / image 1）。FLUX.2-klein 最多约 4 张，超出按「第 1 张锁主体、其余取画风」截断并写入 tips。

### 4.1 单图
- qwen-image-2.1：`严格以第1张参考图的主体形象为准，画面主体是{主体类别词}，关键特征、外形、配色完全保留，`
- Z-Image-Turbo：`严格按照第1张参考图绘制，画面主体是{主体类别词}，外形、配色、特征完全保持不变，`
- Krea2 Turbo：`the {subject category} from reference image 1, keep exact appearance, features and color matching reference image 1,`
- FLUX.2-klein：`consistent appearance matching reference picture 1, the main subject is {subject category}, preserve key features,`

> 四条语义等价，差异只是平台指代写法，同一条里不可混用两种指代。

### 4.2 多图（≥2 张）
第 1 张锁身份，其余仅作画风 / 配饰参考，必须显式声明：
- 中：`第1张参考图锁定主体样貌，其余参考图仅参考画风与配饰，不修改主体特征，`
- 英：`use reference image 1 for identity, other reference images only for art style and accessories, do not change subject appearance,`

### 4.3 单图含多主体
- 中：`以参考图中{位置或特征}的主体为唯一主体，其余人物与物体不出现，`
- 英：`use the {position or feature} subject in the reference as the only subject, exclude all other people and objects,`
- 负面词追加「多余人物，多个主体」；CFG=1 时改为正向 `画面中只出现{位置}的这一个主体`
- 用户未指明主体：先追问；问不到则按「画面中央最突出者」处理并在 tips 说明

### 4.4 例外：要求改外观
- 中：`除{发色改为银白}外，其余外形、配色、特征与第1张参考图完全一致，`
- 英：`except for {hair color changed to silver white}, keep all other appearance, features and colors identical to reference image 1,`
- 只写被显式要求修改的那一项

### 4.5 文字与参考图冲突
显式文字优先。冲突时在 tips 提示「文字与参考图不一致」。

> 绑定语句只是文本约束，真正锁身份靠参考图组件 / IP-Adapter。写入 `ref_binding_note`。

## 5. 分辨率与排版约束

### 5.1 分辨率显存映射

| 显存 | 分辨率 | 说明 |
|---|---|---|
| ≤6G | 1024×768（4:3）| 用 FP8 量化，不开高清修复 |
| 8G | 1536×1024（3:2） | 三/四视图默认 |
| 12~16G | 1792×1024（16:9） | 四视图更宽松 |
| 24G+ | 2048×1152 | 高清设定图 |

> 默认 1536×1024；不用 1024×1024 正方形（横向不足易挤压）；须为 16 的倍数。

### 5.2 长度（只有上限）

| 模型 | token 上限（官方） | 建议上限（超出则裁剪） |
|---|---|---|
| Z-Image-Turbo | 512（可调 1024） | 约 150 词 / 220 汉字 |
| FLUX.2-klein | 512 | 约 120 词 / 180 汉字（蒸馏取下段） |
| Krea2 Turbo | 未公布 | 约 100 词 / 150 汉字 |
| MOSS-Image SFT | 约 4K | 不限（分段组织，文案原样保留） |
| qwen-image-2.1 | 未公布 | 约 180 词 / 270 汉字 |

> 禁止为凑字数扩写；不设下限。多视图天然更长，排版描述必保留，紧张时压画质细节与材质。

### 5.3 超上限裁剪顺序
先裁画质细节 → 材质 → 镜头参数；必须保留主体、排版、画风。裁掉的内容不转入负面词。

### 5.4 排版规则
1. 同分类 ≤3 个（颜色 / 材质 / 光影 / 镜头 / 风格 / 画质）
2. 中英一一对应，单条不混排
3. 逗号分隔，不用多余换行
4. 不用 `(word:1.2)` 权重语法

## 6. 边界与失败模式
以下情形均在 tips 说明：
1. 信息极少 → 用默认多视图骨架补齐，不编造离谱主体
2. 人 + 物体混合多视图 → 提示排版崩坏风险，优先主主体
3. 用户指定模型 → 遵从；若该模型不具备当前模式能力（如 MOSS 做 img2img），遵从但给备选
4. 需求不在多视图范畴（含蒙版重绘）→ 说明本技能不适用
5. 要求正方形输出 → 提示横向空间不足易挤压

## 7. 输出前自检
1. `task_type` 符合 §2.1；「仅画风参考」未误判为 img2img
2. `img2img` 正向首句是绑定语句（§4），含主体类别词锚点、不含具体外观值；多图已分工且未超张数上限；改外观走 §4.4
3. 正负提示词中英一一对应，词条数量相等
4. 参数与 §2.5 一致（已注明变体）；分辨率符合 §5.1 且为 16 倍数
5. 负面词按 CFG 规则输出；物体带正交、人像未带
6. 长度未超 §5.2；超限已按 §5.3 裁剪，未裁掉主体 / 排版 / 画风
