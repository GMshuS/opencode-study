---
name: prompt-generator-videogen
description: 当用户需要生成或优化视频提示词时调用。解析自然语言视频需求，判定场景模式与时序等级（模式A / 模式B1 顺序递进 / 模式B2 阶段分镜），按通用输出骨架输出中英双语正向与负向提示词、模型推荐与理由、API/UI 参数基线、模板变量回填明细。支持文生视频、首帧/首尾帧图生视频、多参考素材生视频、视频生视频V2V、视频局部编辑inpaint-video等场景，覆盖 LTX、Wan-Video、MiniMax-H3、HunyuanVideo；单图生图提示词不属于本技能
---

## 1. 技能定位

接收用户自然语言视频需求，判定场景模式（§2.1）与时序等级（§2.2），按通用输出骨架（§2.3）拆解字段，输出中英双语正负提示词、模型推荐与理由、参数基线、模板变量回填明细。

本技能只做**文本编排与参数建议**：不读取参考图 / 参考视频 / 蒙版本身，参考素材由平台接收，提示词里只用文字引用。

> 提示词文本只写「画面内容 + 运镜语义」；时长、帧率、帧数、分辨率、运动幅度、CFG、步数、seed、denoise、参考权重、蒙版全部属于平台/API 入参，**一律不写进提示词文本**，只在 §3 参数建议块输出。

## 2. 解析流程

### 2.1 场景模式识别（按顺序命中判定）

1. 含「局部修改、改某个物体、只改这块、蒙版、视频编辑」 → `video_inpaint` 视频局部编辑
2. 含「输入视频、保留原有动作、重绘视频、v2v」 → `video2video` 视频生视频
3. 含「多张参考图、多图参考、参考图1参考图2、参考视频、音频参考」 → `multi_ref_img2video` 多参考素材生视频
4. 含「首尾帧、结尾画面、最后一张图」 → `firstlastframe_img2video` 首尾帧图生视频
5. 含「首帧、以这张图开始动、图生成视频」 → `firstframe_img2video` 首帧图生视频
6. 其余纯文本生成视频 → `text2video` 文生视频

> 判定只看用户表述里出现的素材数量与形态，不做视觉识别。场景决定 $REF_CONSTRAINT 前缀（§2.8）与参数建议里的参考权重 / denoise，不决定时序等级；任何场景都可进模式B2，但 V2V / inpaint 下的 B2 需在 tips 说明「动作时序指重绘后应保留的原有动作」。

### 2.2 时序等级判定（先判需求，再按模型能力校正）

**Step 1 需求侧判定**

1. 无先后动作、无阶段切换 → `模式A`
2. 有先后动作（同一场景内多个动作，顺序可辨） → `模式B1 顺序递进`
3. 有阶段切换（场景 / 主体 / 服装 / 时段明确变化） → `模式B2 阶段分镜`

**Step 2 模型能力校正**（按 §2.4 逐级降级，每次降级必须在 tips 说明）

- 能力可承载阶段分镜 → 保留原等级
- 仅可承载轻度时序 → B2 降为 B1（合并阶段，保留先后顺序）
- 时序能力弱 → B1 / B2 降为 A（合并为单段，改写为持续平缓动态）

> 模式B1 / B2 一律**禁止秒级时间戳**（`0-2s`、`2-5秒`）：视频模型没有时间轴控制接口，时间戳不会被兑现，只会被当作内容 token 消耗，同时在语义上暗示「硬切换」，与 §4.4 的全局一致约束冲突。先后关系一律用自然顺序表达：`先…随后…接着…最后…`。

### 2.3 通用输出骨架与字段拆解

提示词按固定槽位组装——**主体 / 动作 / 场景 / [景别] / [运镜] / [光线] / [风格] / [氛围]，顺序不可打乱**——映射到模板变量：

1. `$REF_CONSTRAINT`：场景参考约束前缀（§2.8 自动生成，中英双语）
2. `$SUBJECT_ACTION`：主体（+ 模式A 的持续动作）；模式B1 / B2 的动作并入 `$TIME_SCRIPT`
3. `$TIME_SCRIPT`：时序内容；模式A 填 `—`；模式B1 填顺序短句；模式B2 填分镜段落（中英成对）
4. `$ENV_LIGHT`：场景、天气、光影色调（含光线槽位）
5. `$CAMERA`：景别与运镜的语义描述（不是参数）
6. `$STYLE_QUALITY`：风格、画质、材质细节（含氛围槽位）
7. `$MODEL_GUARD`：模型防护语句（§2.7）

> - 用户没有描述的槽位填 `—`，不为凑格式强行增加关键词
> - 用户明确不想要的画面问题，统一归入负向提示词
> - 图生视频 / V2V / inpaint 不编造参考素材不存在的物体特征；主体槽位只写类别与身份锚点；约束语句必须放在提示词开头

### 2.4 模型能力档案（版本敏感项集中于此，按实际平台核对后填写）

| 模型 | 时序承载力 | 原生音频 | 参考素材上限 | 蒙版 / 编辑 |
|---|---|---|---|---|
| Wan-Video | 弱（降级为模式A） | 无 | 首帧 1 张 | 扩展支持（需 VACE 等组件） |
| LTX | 弱（降级为模式A） | 视版本而定 | 约 4 张 | 扩展支持 |
| MiniMax-H3 | 中（仅轻度） | 有（立体声、对白同步） | ≤9 图 / ≤3 视频 / ≤3 音频 | **无蒙版接口** |
| HunyuanVideo | 强 | 无 | 视版本而定 | 扩展支持（需 VACE 等组件） |

> 标注「视版本而定」的项，输出时必须在 tips 提示「以实际平台版本为准」；扩展组件未安装时不要输出该模式的参数建议，改推原生支持的模型（支持场景见 §2.9）。

### 2.5 模型推荐决策表（单一有序表：从上到下取第一个命中为首选）

| 优先级 | 触发条件（需求特征） | 首选 | 备选 | 一句话理由 |
|---|---|---|---|---|
| 0 | 用户点名模型 | 用户指定 | 无 | 用户指定模型 |
| 1 | 需要原生音频 / 对白口型同步 | MiniMax-H3 | LTX | 二者部分版本可原生输出带声视频，其余需后期配音 |
| 2 | 多参考素材混用（图 + 视频 + 音频） | MiniMax-H3 | 无 | 参考素材容量最大（≤9 图 / ≤3 视频 / ≤3 音频） |
| 3 | 阶段分镜 / 剧情叙事（≥3 段变化） | HunyuanVideo | MiniMax-H3 | 阶段与动作顺序表达最强 |
| 4 | 强风格化 / 二次元渲染 | LTX | Wan-Video | 风格渲染强、迭代快 |
| 5 | 稳定性优先 / 抑制闪烁抖动 | Wan-Video | LTX | 时序一致性稳 |
| 6 | 写实光影材质 / 高分辨率出片 | MiniMax-H3 | LTX | 材质与光影层次强 |

> - 命中多条 → 按优先级取第一个为首选，其余命中行的限制（见 §2.4 / §2.9）合并写入 tips。
> - 决策顺序：用户指定 > 硬能力 > 时序等级 > 参考素材形态 > 音频需求 > 风格偏好 > 稳定性偏好。
> - 以上均不命中时默认 LTX；优先级 1 / 2 为公开文档可查事实，4 / 5 为经验判断。

### 2.6 负向提示词包（中英双语）

> 取用 = 基础包（全模型） + 模型追加（仅该模型） + 场景追加（仅该场景） + 用户明确排除项。用户排除项优先，允许追加，但须在回填明细中标注「用户指定」；除此之外不得自造通用词。

| 维度 | 取值 | 中文 | English |
|---|---|---|---|
| 基础 | video-base | 肢体扭曲，手指畸形，面部崩坏，五官错乱，闪烁，画面抖动，撕裂重影，水印，文字，logo，模糊，噪点，穿模 | distorted limbs, malformed fingers, broken face, distorted facial features, flicker, camera shake, tearing, ghosting, watermark, text, logo, blurry, noise, penetration artifacts |
| 模型 | Wan-Video | 人脸融化，身份漂移，呼吸式缩放 | face melting, identity drift, breathing-scale pulsing |
| 模型 | LTX | 主体身份丢失 | loss of subject identity |
| 模型 | MiniMax-H3 | 材质割裂，音频与画面不同步 | inconsistent material texture, audio-visual desync |
| 模型 | HunyuanVideo | 表情随帧突变，人脸融化 | jumping expression frame by frame, face melting |
| 场景 | firstframe_img2video | 构图漂移，主体移位 | composition drift, subject displacement |
| 场景 | firstlastframe_img2video | 首尾衔接断裂，构图跳变 | broken first-last continuity, composition jump |
| 场景 | multi_ref | 人物样貌跳变，画风频繁切换 | character appearance shifting, frequent style switching |
| 场景 | video2video | 原画风残留，动作错乱 | residual original style, broken motion |
| 场景 | video_inpaint | 修改区域边缘错位，融合不自然 | misaligned edge on edited area, unnatural blending |
| 场景 | 模式B2 分镜 | 场景突变，人物换装，光影断层 | abrupt scene change, character outfit shift, lighting discontinuity |
| 场景 | 真人肖像 | 蜡像脸，塑料皮肤，过度磨皮 | waxy face, plastic skin, over-smoothed skin |
| 场景 | 无声视频 | 背景音乐，人声，音效 | background music, voice, sound effects |

> - `文字、logo / text, logo` 仅在「画面不需要文字」时保留；带字需求必须删掉这 4 个词。
> - 平台无独立负向字段时（如 MiniMax-H3 API 未提供 `negative_prompt`），把负向词改写成正向排除句追加到提示词末尾，例如 `no watermark, no text, no flicker`，不要整块丢弃，并在回填明细中标注「已改写为正向排除句」。
> - 视频模型 CFG 恒大于 1（§2.9），负向词始终参与计算，不存在生图技能里的 CFG=1 特例；用户要求「不要卡通感 / 不要过曝」等具体风格排除项时，写成风格排除短句追加，不替换包内既有词。

### 2.7 $MODEL_GUARD 模型防护词对照表（中英成对，填入正向提示词末尾）

| 模型 | 中文防护语句 | English guard prompt |
|---|---|---|
| Wan-Video | 画面稳定，动作平缓，避免剧烈形变与突兀突变 | Stable image, gentle motion, avoid severe deformation and abrupt changes |
| LTX | 物体一致性优先，缓慢变化，减少闪烁，主体特征保持 | Prioritize object consistency, slow changes, reduce flickering, keep subject features |
| MiniMax-H3 | 光影过渡柔和，材质质感连贯，人脸稳定，小幅渐变优先 | Soft lighting transition, coherent material texture, stable face, prioritize small gradual changes |
| HunyuanVideo | 面部稳定，表情连贯，动作流畅，支持柔和时序变化 | Stable facial features, coherent expression, smooth motion, support soft temporal transition |

> 防护句只追加一次；不重复负向包已覆盖的效果词。

### 2.8 $REF_CONSTRAINT 模式前缀中英对照

前缀只做「参考素材绑定」与「禁止项」，**不重复描述参考图已有的外貌、服装、配色**。

| 场景 | 开头（中文 / English） | 结尾（中文 / English） |
|---|---|---|
| text2video | 无 | 无 |
| firstframe_img2video | `保持首帧构图与主体不变，只描述动态：` / `Keep the first-frame composition and subject unchanged; describe only the motion:` | — |
| firstlastframe_img2video | `保持首帧与尾帧构图一致，主体不变，只描述中间过程：` / `Keep composition consistent with the first and last frames; subject unchanged; describe only what happens between:` | — |
| multi_ref | `第1张参考图锁定主体身份，其余参考图仅提供画风与配色参考，主体特征不变，` / `use reference image 1 for subject identity; other references only for style and color; keep subject appearance unchanged,` | — |
| video2video | `保留原视频的动作时序与镜头轨迹，仅重绘画面外观：` / `Preserve the original motion timing and camera track; only redraw the appearance:` | — |
| video_inpaint | `画面其余元素、构图、人物、光影色调全部不变，仅修改蒙版区域；蒙版区域：` / `All other elements, composition, character, lighting and tone remain unchanged; only modify the masked area; Mask area:` | `光影与原视频光源统一，边缘柔和自然，无缝融合` / `light source consistent with the source video, soft natural edges, seamless blending` |

> - 用户要换背景 / 换服装 / 换风格时，把被「保留」的那一项改成具体要求（例：把「保持首帧构图」改为「背景替换为纯白」）。
> - multi_ref 默认策略为「第 1 张锁身份、其余取画风」；仅当用户显式指定分工（脸 / 场景 / 画风）时才按指定分工写。
> - 参考素材上限见 §2.4，超出时按默认策略截断并在 tips 说明；video_inpaint 的「蒙版区域：」后面接用户要求修改的内容（蒙版内主体 + 目标状态）。
> - 前缀计入 §2.9 的长度上限。

### 2.9 参数基线快照（2026-10 快照 · 官方值与经验值已标注）

| 模型 | 支持场景 | 时长 | 步数 | CFG | 运动幅度 | 参考权重 | denoise | 提示词长度上限 |
|---|---|---|---|---|---|---|---|---|
| Wan-Video | 原生 t2v / img2v；v2v / inpaint 扩展 | 4-6s（≈5s） | 20-24 | 3.5-5.0 | shift 5.0 | 0.6-0.8 | 0.4-0.6 | 80-120 汉字 / ≈60-85 词 |
| LTX | 原生 t2v / img2v / v2v | 4-6s（≈5s） | 完整 20-30 / 蒸馏 8-12 | 2.5-4.0 | 0.3-0.7 | 0.5-0.9 | 0.5-0.9 | 80-120 汉字 / ≈60-85 词 |
| MiniMax-H3 | 原生 t2v / img2v（首/尾帧）/ multi-ref；v2v 为再生成式 | 4-15s 整数（建议 5/10/15） | 平台不暴露 | 平台不暴露 | 平台不暴露 | ≤9 图 / ≤3 视频 / ≤3 音频 | — | 120-200 汉字 / ≈85-140 词 |
| HunyuanVideo | 原生 t2v / img2v；multi-ref / v2v / inpaint 扩展 | 5s 基线，>8s 需拼接 | 40-50 | 5.0-7.0（基线 6.0） | shift 5.0 | 0.7-0.9 | 0.3-0.5 | 100-160 汉字 / ≈70-110 词 |

> - 长度上限只有上限、没有下限；是「再写也不会更好」的拐点，不是配额。
> - 帧数 / fps / 分辨率随平台差异大，按实际默认值填写，不在提示词中出现。
> - >8s 用「上一段末帧接下一段首帧」分段拼接，段长 ≤5s，拼接处光影色调对齐。
> - 低分辨率 + 人脸占画面 <1/10 时易人脸融化：裁近主体或缩短帧数。
> - 平台不暴露的参数写「平台不暴露」，不要臆造数值；运动幅度越大越易闪烁，先降幅度再改提示词。

## 3. 输出格式 Markdown

```markdown
## 🎬 视频生成提示词结果
任务类型：{{task_type}}
运行模式：{{run_mode}} 【模式A｜模式B1 顺序递进｜模式B2 阶段分镜】
✅ 推荐模型：{{recommend_model}}｜备选：{{alternative_model}}
理由：{{reason}}
---
### ✅ 正向提示词（中文）
{{ref_constraint_cn}}{{positive_cn}}{{mode_suffix_cn}}
### ✅ Positive Prompt (English)
{{ref_constraint_en}}{{positive_en}}{{mode_suffix_en}}
---
### ❌ 负向提示词（中文）
{{negative_cn}}
### ❌ Negative Prompt (English)
{{negative_en}}
---
### ⚙️ API / UI 参数建议（不写入提示词）
- 建议视频时长：{{video_duration}}
- 采样步数：{{steps}}
- CFG：{{cfg}}
- 运动幅度（shift / motion strength）：{{motion_scale}}
- 参考素材权重（图生视频场景）：{{ref_weight}}
- 重绘强度 denoise（V2V / 局部编辑）：{{denoise_strength}}
- 平台未暴露的参数：{{not_exposed}}
### 📝 模板变量回填明细
$REF_CONSTRAINT：{{ref_constraint_val}}
$TIME_SCRIPT：{{time_script_cn}} / {{time_script_en}}
$SUBJECT_ACTION：{{subject_action_val}}
$ENV_LIGHT：{{env_light_val}}
$STYLE_QUALITY：{{style_quality_val}}
$CAMERA：{{camera_val}}
$MODEL_GUARD：{{model_guard_val}}
### 💡 风险与使用小贴士
{{tips_content}}
```

> - 不适用的小节整节省略；`{{time_script_cn}}` 与 `{{time_script_en}}` 必须成对出现，模式A 时均为 `—`。
> - 模式B2 的分镜段落写在 `{{time_script_*}}` 内，段间不加时间戳。

## 4. 排版与长度约束

### 4.1 必备要素

- 模式A：主体 + 可观察动作 + 场景，三项缺一不可。缺则先追问，问不到按默认取值并在 tips 说明。
- 模式B1：主体 + 动作顺序 + 场景。
- 模式B2：主体 + 阶段场景 + 阶段动作。
- **不得堆形容词补足**。

### 4.2 超上限裁剪顺序

先裁画质细节 → 材质 → 氛围 → 运镜细节；必须保留主体、动作、场景。裁掉的内容不转入负向词。

### 4.3 排版规则

1. 同分类 ≤3 个（颜色 / 材质 / 光影 / 运镜 / 风格 / 画质）。
2. 运镜全文只给一种镜头运动，禁止同时写 push-in + pan，禁止「cut to / 切镜头」。
3. 动作必须显式（呼吸、发丝飘动、缓慢转身）；「平缓」不等于静止，无动作动词易退化为抖动与闪烁。
4. 禁止抽象形容词（"很美"、"非常震撼"、"超现实"），改写为可量化的画面特征。
5. 中英一一对应，单块不混排；中文逗号 / 英文逗号分别分隔各自语言提示词，避免多余换行；品牌、型号、镜头术语保留原文。
6. 不使用 `(word:1.3)` 括号权重语法；强调改用语序前置或独立短句。

### 4.4 模式B 书写规范

- **B1**：动作数 ≤3，写成独立短句 `先…随后…最后…`，禁止塞进同一个从句；主体在多个动作中需有稳定指代，避免用「它 / 他们」跨动作漂移。
- **B2**：段数 ≤3，每段含「主体 + 该段动作 + 该段场景」，每段一个主动作；段间不给时间戳，靠「随后 / 接着 / 最后」建立顺序；光影、色调、画风、主体一致性首段声明一次、末段重申一次；段内不出现新的全局性描述；强制附带全局统一约束 `全程光影画风统一，禁止突兀跳变` / `keep consistent lighting and art-style through whole video, forbid abrupt jump`。

## 5. 边界与失败模式处理

1. 用户需求包含音频、剪辑、3D 模型导出、超分后处理 → 在 tips 明确说明：本技能仅处理视频生成提示词，不处理该部分能力。
2. 用户输入互斥画面需求，保留主需求，冲突项移入负向词，tips 写明取舍。
3. 信息不足时可以合理补通用修饰，禁止编造与用户描述冲突的主体、动作、场景。
4. 用户强制给模型做超出能力的任务（例如给 Wan-Video 要求阶段分镜）→ 遵从用户指定模型，同时在 tips 写明风险：该模型时序能力弱，容易出现跳变、闪烁、主体丢失，建议切换 HunyuanVideo / MiniMax-H3。
5. 用户指定 MiniMax-H3 做局部蒙版重绘 → 遵从指定，但在 tips 明确：该模型无蒙版接口，局部修改需改用其它支持蒙版的模型或工具。
6. 用户指定平台不支持的参考素材形态 → 遵从指定，处理方式见 §2.8。

## 6. 输出前自检清单

1. **决策**：场景（§2.1）、时序等级（§2.2）、模型（§2.5）三项判定均已完成且互相一致；场景类型与 §2.8 前缀表匹配；时序降级已写入 tips。
2. **结构**：提示词按 §2.3 骨架组装、顺序未打乱、未描述槽位填 `—`；$REF_CONSTRAINT 中英前缀齐全且置于提示词最开头，未复述参考图已有外貌服装配色；$MODEL_GUARD 已追加到末尾且仅一次；$TIME_SCRIPT 中英成对写入对应槽位（模式A 均为 `—`），B2 已带全局一致约束。
3. **对齐**：正负提示词中英一一对应、词条数量相等；全文无秒级时间戳；时长、帧率、运动幅度、CFG、步数、分辨率等接口参数未混入提示词文本。
4. **负向词**：按 §2.6 取用（基础 + 模型 + 场景 + 用户排除项）；平台无负向字段时已改写为正向排除句并标注；用户排除项已标「用户指定」。
5. **参数**：与 §2.9 一致；平台不暴露的参数写「平台不暴露」；扩展组件缺失时已改推原生支持的模型。
6. **长度与风险**：长度未超 §2.9 上限，超限已按 §4.2 裁剪；主体 / 动作 / 场景齐全，无为凑字数堆砌；风险点已全部写入小贴士块，不省略。
