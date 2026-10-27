---
name: prompt-generator-multiview
description: 当用户需要三视图、四视图、角色设定表或物体设定表时调用；解析多视图生图需求，输出中英正向、中英负面提示词、推荐模型、生成参数、显存适配尺寸、参考图绑定约束；支持真人人像、动漫角色、产品物体，区分txt2img文生图、img2img参考图生图模式；普通单图提示词不属于本技能
---
## 1. 技能定位
把三视图 / 四视图设定表需求拆成 9 段结构，输出中英双语正负提示词、推荐模型与参数。仅处理多视图设定表（三/四视图、角色或物体设定图）；单图普通生图、蒙版局部重绘不适用。

本技能只做文本编排：**不读取、不搜索图片文件**。参考图由出图平台接收，提示词里只用文字引用它。

## 2. 解析流程

### 2.1 模式识别（按顺序判定，命中即定）
1. 含「参考图 / 保留原图样貌 / 依据图片 / 图片1 / 图2 / 附图 / img2img / 以这张图为准」→ `img2img`
2. 其它 → `txt2img`

> 不处理 `inpaint`，出现蒙版 / 局部修改时说明本技能不适用。

### 2.2 拆解字段
1. subject 主体（`txt2img` 写明关键特征；`img2img` 直接放 §4 的绑定语句，不写任何外观词）
2. pose_action 动作姿态（固定 T-pose，标准站立；禁止动态姿势）
3. layout 排版布局（三视图 / 四视图；独立分栏；分割线；横向排布；画面不重叠；物体额外增加正交视图）
4. environment 环境背景（纯白 / 浅灰二选一；写实真人与产品默认纯白，动漫人设默认浅灰）
5. lighting 光线（固定：均匀柔光，全场光影一致）
6. camera 镜头参数（全身完整入镜）
7. material 材质（人物写肤质 / 服饰材质；物体写外壳、漆面、塑料金属；无则填「—」）
8. style 画风（写实摄影 / 赛璐璐平涂原画 / 工业工程参考图）
9. quality 画质细节（高清，轮廓清晰，资产设定图，构图干净）

> - 顺序不可打乱；用户缺失的字段用内置标准词补充，不堆砌
> - `img2img` 模式不描述主体任何特征（类别词也可省），外观一律由参考图决定
> - 不读取、不搜索图片文件
> - 物体分支强制追加「正交视图，无透视」，人像禁止该词
> - 用户明确排除的效果移入负面词
> - `img2img` 的参考图绑定语句见 §4

### 2.3 模型推荐

| 需求特征 | 推荐模型 | 理由 |
|---|---|---|
| 重视排版分栏理解、中文自然指令 | qwen-image-2.1 | 分栏排版理解力最强，中文语义优秀 |
| 二次元 OC、动漫角色设定表、赛璐璐画风 | Z-Image-Turbo | 二次元画风表现好，8 步出图迭代快 |
| 物体 / 产品 / 工业三视图、长提示词、复杂排版 | FLUX.2-klein | 长 prompt 承载力强，原生支持参考图编辑 |
| 真人数字人、强 ID 一致性锁脸 | Krea2 Turbo | 参考图锁身份能力强，出图快 |

> 混合需求输出首选 + 备选；用户指定模型则遵从，理由写「用户指定模型」。

### 2.4 负面词包（直接取用，不自行发明）

| 品类 | 中文 | English |
|---|---|---|
| 人像多视图 | 肢体畸形，五官扭曲，手指错乱，画面互相融合重叠，不同人物，动态姿势，透视混乱，文字，水印，logo | deformed limbs, distorted facial features, malformed fingers, merged panels, different people, dynamic pose, broken perspective, text, watermark, logo |
| 动漫人设 sheet | 角色长相不一致，分栏画面融合，肢体崩坏，多余肢体，扭曲变形，文字水印，杂乱背景 | inconsistent character appearance, merged panels, broken limbs, extra limbs, distortion, text, watermark, cluttered background |
| 工业正交物体 | 透视畸变，画面重叠，物体变形，多余部件，阴影杂乱，文字水印，环境杂物 | perspective distortion, overlapping panels, object deformation, extra parts, messy shadow, text, watermark, miscellaneous objects |

按模型决定是否输出负面词：FLUX.2-klein 输出完整负面；Z-Image-Turbo 与 Krea2 Turbo 在 CFG≈1 时负面词无效，排除项改写为正向「仅包含 Y」，仅 CFG>1.2 时输出 ≤6 项；qwen-image-2.1 以管线为准，不支持时并入正向限定。

### 2.5 参数基线（2026-10 快照，起始值）

| 模型 | denoising（img2img） | steps | CFG |
|---|---|---|---|
| qwen-image-2.1 | 0.6~0.75 | 20~30 | 以管线为准 |
| Krea2 Turbo | 0.6~0.7 | 6~8 | 1.0~1.5 |
| FLUX.2-klein（蒸馏） | 0.55~0.7 | 4~6 | 1.0 |
| FLUX.2-klein（Base） | 0.55~0.7 | 20~28 | 3.5~4.0 |
| Z-Image-Turbo | 0.6~0.7 | 8~10 | 1.0~1.5 |

> FLUX.2-klein 必须注明变体（蒸馏 / Base），两者步数差 4 倍以上。

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

> 不适用的小节（负面提示词、参考图绑定说明）整节省略，不留空标题。理由栏写推荐依据；用户指定模型写「用户指定」。

## 4. 参考图绑定插入规则
`txt2img` 不插入绑定语句。`img2img` 的绑定语句就是正向开头第一句，取代主体描述。

### 4.1 单参考图，按模型二选一（语法不可混用）
- qwen-image-2.1（中文）：`严格以第1张参考图的主体形象为准，关键特征、外形、配色完全保留，不要生成别的主体，`
- Krea2 Turbo（英文）：`the subject from reference image 1, keep exact appearance, features and color matching reference image 1,`
- FLUX.2-klein（英文）：`consistent appearance matching reference picture 1, preserve key features,`
- Z-Image-Turbo（中文）：`严格按照第1张参考图绘制，外形、配色、特征完全保持不变，`

### 4.2 多参考图（≥2 张）
第 1 张锁定主体身份，其余仅作画风 / 配饰参考，必须显式声明，禁止只提第 1 张而忽略其余图片：
- 中文追加：`第1张参考图锁定主体样貌，其余参考图仅参考画风与配饰，不修改主体长相，`
- 英文追加：`use reference image 1 for identity, other reference images only for art style and accessories, do not change subject appearance,`
- 用户指定某张为主体时，用「用户指定那张」替换「第1张」

> 绑定语句只是文本约束，真正身份锁定依靠参考图组件 / IP-Adapter 节点。以上说明写入 `ref_binding_note`。

## 5. 分辨率与排版约束

### 5.1 分辨率显存映射

| 显存 | 分辨率 | 说明 |
|---|---|---|
| ≤6G | 1024×768（4:3） | 用 FP8 量化，不开高清修复 |
| 8G | 1536×1024（3:2） | 三/四视图默认 |
| 12~16G | 1792×1024（16:9） | 四视图更宽松 |
| 24G+ | 2048×1152 | 高清设定图 |

> 默认 1536×1024；不用正方形 1024×1024（横向不足易挤压重叠）；分辨率须为 16 的倍数。

### 5.2 排版约束
1. 同分类关键词不超过 3 个
2. 中英语义一一对应，单条提示词内不混排
3. 逗号分隔，不用多余换行

## 6. 边界与失败模式
以下情形均在 tips 说明原因与替代建议：
1. 信息极少 → 用默认多视图骨架补齐，不编造离谱主体
2. 人 + 物体混合多视图 → 提示排版崩坏风险，优先主主体
3. 用户指定模型 → 遵从，理由写「用户指定模型」，旧代号按 §1 映射
4. 需求不在多视图范畴（含蒙版重绘）→ 说明本技能不适用
5. 要求正方形输出 → 提示横向空间不足易挤压重叠

## 7. 输出前自检
1. `task_type` 符合 §2.1 判定
2. `img2img` 正向开头即对应模型的绑定语句（§4），未出现任何外观词；多图已声明 identity+style 分工
3. 正负提示词中英一一对应，无违规混排
4. 参数与 §2.5 一致（FLUX.2-klein 已注明变体），分辨率符合 §5.1 且为 16 倍数
5. 负面词按 §2.4 模型规则输出；物体分支带正交、人像未带
