---
name: prompt-generator-videogen
description: 当用户需要生成或优化视频提示词时调用。解析自然语言视频需求，判定场景模式与时序等级（模式A / 模式B1 顺序递进 / 模式B2 阶段分镜），按通用输出骨架输出中英双语正向与负向提示词、模型推荐与理由、API/UI 参数基线、模板变量回填明细。支持文生视频、首帧/首尾帧图生视频、多参考素材生视频、视频生视频V2V、视频局部编辑inpaint-video等场景，覆盖 LTX、Wan-Video、MiniMax-H3、HunyuanVideo；单图生图提示词不属于本技能
---

## 1. 技能定位

接收用户自然语言视频需求，判定场景模式（§2.1）与时序等级（§2.2），按通用输出骨架（§2.3）拆解字段，输出中英双语正负提示词、模型推荐与理由、参数基线、模板变量回填明细。

本技能只做**文本编排与参数建议**：不读取参考图 / 参考视频 / 蒙版本身，参考素材由平台接收，提示词里只用文字引用。

> 提示词文本只写「画面内容 + 运镜语义」；时长、帧率、帧数、分辨率、运动幅度、CFG、步数、seed、denoise、参考权重、蒙版全部属于平台/API 入参，**一律不写进提示词文本**，只在 §3 参数建议块输出。
> 版本敏感事实（模型能力、参数数值、prompt 上限）以 §2.4 与 §2.9 为唯一来源，输出前按实际平台版本复核；frontmatter 与其它章节不承载数值。

## 2. 解析流程

### 2.1 场景模式识别（语义判定，按素材形态分层）

以用户**意图**为准，关键词仅作锚点、不作穷举匹配。判别关键（按序自问）：

1. 是否存在输入视频？是否要求保留原有动作 / 镜头轨迹？
2. 改动覆盖整段，还是点名局部区域 / 对象？
3. 提供了哪些素材（无 / 1 张首帧 / 首尾 2 张 / ≥2 份混合素材 / 视频 + 蒙版）？
4. 是要「保留素材里可识别的内容」，还是只借用风格 / 配色 / 氛围重新生成？

| 场景 | 语义判据 | 锚点短语（非穷举，仅辅助） |
|---|---|---|
| `video_inpaint` | 已有视频 + 点名局部区域或对象做增删改，其余保持不变 | 把…换成…、只改这块、只动一下、蒙版重绘 |
| `video2video` | 已有视频 + 整段重绘，保留动作时序与镜头轨迹 | 用这段视频重绘、保留原动作、v2v |
| `multi_ref_img2video` | 上传 ≥2 份素材（图 / 视频 / 音频）并要求共同参与生成 | 参考图1/图2、这几张图、加上这段音频 |
| `firstlastframe_img2video` | 提供首尾两张帧图，由模型补全中间过程 | 首尾帧、结尾画面、最后一张图 |
| `firstframe_img2video` | 提供单张图作为起始帧，只补动态 | 首帧、让这张图动起来、图生视频 |
| `text2video` | 无输入素材，仅文本生成 | — |

> - 只借用风格 / 配色 / 氛围且无素材上传 → `text2video`，写入 `$STYLE_QUALITY`；出现「参考」二字不等于 `multi_ref_img2video`。
> - 「蒙版」仅在指编辑操作时命中；作为画面元素出现（如「蒙版效果海报」）不命中。
> - 上表顺序只用于判据同时满足时消解（局部 > 整段 > 多素材 > 双帧 > 单帧），**不是关键词命中顺序**。
> - 判据冲突或素材形态不明时，在 tips 写明按哪种理解输出；当「是否保留原素材内容」显著影响结果时追问一句。**不得因关键词缺失就默认 `text2video` 并强行编造画面。**
> - 平台术语（v2v / inpaint / 首尾帧）命中时直接对应，仍按语义判据复核。
> - 判定时同时提取每份参考素材的**用户指定角色**（身份 / 场景 / 画风 / 动作 / 音频…），写入 §2.8 的 `$REF_ROLES`；未指定记为「未指定」。
> - 判定只看用户表述里的素材数量与形态，不做视觉识别。场景决定 `$REF_CONSTRAINT` 前缀（§2.8）与参数建议里的参考权重 / denoise，不决定时序等级；任何场景都可进模式B2，但 V2V / inpaint 下的 B2 需在 tips 说明「动作时序指重绘后应保留的原有动作」。

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

### 2.3 通用输出骨架与字段拆解（6 槽位，顺序不可打乱）

提示词按固定槽位组装——**主体 / 动作 / 场景 / [景别] / [运镜] / [光线] / [风格] / [氛围]，顺序不可打乱**——映射到模板变量：

1. `$REF_CONSTRAINT`：场景参考约束前缀，置于最开头（§2.8 自动生成，中英双语）
2. `$SUBJECT_MOTION`：**主体 + 动作内容，三种模式均必填**；时序是本字段的书写格式，不是独立字段：
   - 模式A：单一持续动作，一句写完
   - 模式B1：`先…随后…最后…` 顺序短句（动作 ≤3）
   - 模式B2：≤3 段分镜，每段「主体 + 该段主动作 + 该段场景要素」
3. `$ENV_LIGHT`：全局场景、天气、光影色调（含光线槽位）；B2 时只写各段共享的全局光影，段内只写该段特有场景要素，不得与 `$SUBJECT_MOTION` 重复
4. `$CAMERA`：景别与运镜的语义描述（不是参数）
5. `$STYLE_QUALITY`：风格、画质、材质细节（含氛围槽位）
6. `$MODEL_GUARD`：模型防护语句，追加一次（§2.7）

> - 主体与动作合并为单槽位，模式A 不再输出 `—` 占位行；B2 分镜段落中英逐段对应，写在 `$SUBJECT_MOTION` 内。
> - 用户没有描述的槽位填 `—`，不为凑格式强行增加关键词
> - 用户明确不想要的画面问题，统一归入负向提示词
> - 图生视频 / V2V / inpaint 不编造参考素材不存在的物体特征；主体槽位只写类别与身份锚点；约束语句必须放在提示词开头

### 2.4 模型能力档案（版本敏感项集中于此，按实际平台核对后填写）

| 模型 / 版本 | 时序承载力 | 原生音频 | 参考素材上限 | 蒙版 / 编辑 |
|---|---|---|---|---|
| Wan-Video 2.1 / 2.2 | 弱～中（按版本，仍建议降级为模式A） | 无 | 首帧 1 张；FLF2V 首尾 2 张 | 扩展支持（需 VACE 等组件） |
| LTX-Video 0.9.x | 弱（降级为模式A） | 无 | 0.9.5+ 支持多条件图 / 视频插值 | 扩展支持 |
| LTX 2.3 / 2.5 | 2.5 起支持原生多镜头，可承载 B2 | 2.5 起支持同步音视频 | 按版本核对 | 按版本核对 |
| MiniMax-H3（海螺 02 / 2.3 系） | 中（仅轻度） | 有（立体声、对白同步） | ≤9 图 / ≤3 视频 / ≤3 音频，按平台上限核对 | **无蒙版接口** |
| HunyuanVideo | 强 | 无 | 视版本而定 | 扩展支持（需 VACE 等组件） |

> - 同一模型族的变体能力与参数不同，必须按 §2.9 对应的变体行取值，**不得跨行套用**；标注「视版本而定 / 按版本核对」的项，输出时必须在 tips 提示「以实际平台版本为准」。
> - 扩展组件未安装时不要输出该模式的参数建议，改推原生支持的模型（支持场景见 §2.9）。
> - 本节与 §2.9 是版本敏感数值的唯一来源；frontmatter 与其它章节不承载数值。

### 2.5 模型推荐决策表（单一有序表：从上到下取第一个命中为首选）

| 优先级 | 触发条件（需求特征） | 首选 | 备选 | 一句话理由 |
|---|---|---|---|---|
| 0 | 用户点名模型 | 用户指定 | 无 | 用户指定模型 |
| 1 | 需要原生音频 / 对白口型同步 | MiniMax-H3 | LTX 2.5+（仅该版本） | MiniMax-H3 与 LTX 2.5+ 可原生输出带声视频，其余版本需后期配音 |
| 2 | 多参考素材混用（图 + 视频 + 音频） | MiniMax-H3 | 无 | 参考素材容量最大（≤9 图 / ≤3 视频 / ≤3 音频） |
| 3 | 阶段分镜 / 剧情叙事（≥3 段变化） | HunyuanVideo | MiniMax-H3 | 阶段与动作顺序表达最强 |
| 4 | 强风格化 / 二次元渲染 | LTX | Wan-Video | 风格渲染强、迭代快 |
| 5 | 稳定性优先 / 抑制闪烁抖动 | Wan-Video | LTX | 时序一致性稳 |
| 6 | 写实光影材质 / 高分辨率出片 | MiniMax-H3 | LTX | 材质与光影层次强 |

> - 命中多条 → 按优先级取第一个为首选，其余命中行的限制（见 §2.4 / §2.9）合并写入 tips。
> - 决策顺序：用户指定 > 硬能力 > 时序等级 > 参考素材形态 > 音频需求 > 风格偏好 > 稳定性偏好。
> - 以上均不命中时默认 LTX（须注明变体）；优先级 1 / 2 为公开文档可查事实，4 / 5 为经验判断。

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
> - multi_ref 场景词「画风频繁切换 / frequent style switching」仅在用户未要求画风变化时保留；用户明确要求分段换画风时删除该词，其余保留。
> - **负向词是否生效由本次参数建议中的 CFG 决定**（§2.9）：`CFG > 1` 时正常输出两节，按上方取用规则组包；`CFG = 1`（蒸馏 / Turbo 变体）或平台无独立负向字段时（如 MiniMax-H3 API 未提供 `negative_prompt`），负向词不参与计算，两节整节省略，把负向词与用户排除项改写成正向排除句追加到提示词末尾，例如 `no watermark, no text, no flicker`，不整块丢弃，并在回填明细标注「已改写为正向排除句」、在 tips 说明原因。
> - 用户要求「不要卡通感 / 不要过曝」等具体风格排除项时，写成风格排除短句追加，不替换包内既有词。

### 2.7 $MODEL_GUARD 模型防护词对照表（中英成对，填入正向提示词末尾）

| 模型 | 中文防护语句 | English guard prompt |
|---|---|---|
| Wan-Video | 画面稳定，动作平缓，避免剧烈形变与突兀突变 | Stable image, gentle motion, avoid severe deformation and abrupt changes |
| LTX | 物体一致性优先，缓慢变化，减少闪烁，主体特征保持 | Prioritize object consistency, slow changes, reduce flickering, keep subject features |
| MiniMax-H3 | 光影过渡柔和，材质质感连贯，人脸稳定，小幅渐变优先 | Soft lighting transition, coherent material texture, stable face, prioritize small gradual changes |
| HunyuanVideo | 面部稳定，表情连贯，动作流畅，支持柔和时序变化 | Stable facial features, coherent expression, smooth motion, support soft temporal transition |

> 防护句只追加一次；不重复负向包已覆盖的效果词；计入 §2.9 的官方硬上限。

### 2.8 $REF_CONSTRAINT 模式前缀中英对照

前缀只做「参考素材绑定」与「禁止项」，**不重复描述参考图已有的外貌、服装、配色，也不擅自指派参考图分工**。

| 场景 | 开头（中文 / English） | 结尾（中文 / English） |
|---|---|---|
| text2video | 无 | 无 |
| firstframe_img2video | `保持首帧构图与主体不变，只描述动态：` / `Keep the first-frame composition and subject unchanged; describe only the motion:` | — |
| firstlastframe_img2video | `保持首帧与尾帧构图一致，主体不变，只描述中间过程：` / `Keep composition consistent with the first and last frames; subject unchanged; describe only what happens between:` | — |
| multi_ref | `按各参考素材的指定用途使用，保持主体身份与画风一致；` / `Use each reference according to its assigned role; keep subject identity and style consistent;` | 接 `$REF_ROLES`（中英成对） |
| video2video | `保留原视频的动作时序与镜头轨迹，仅重绘画面外观：` / `Preserve the original motion timing and camera track; only redraw the appearance:` | — |
| video_inpaint | `画面其余元素、构图、人物、光影色调全部不变，仅修改蒙版区域；蒙版区域：` / `All other elements, composition, character, lighting and tone remain unchanged; only modify the masked area; Mask area:` | `光影与原视频光源统一，边缘柔和自然，无缝融合` / `light source consistent with the source video, soft natural edges, seamless blending` |

> - **multi_ref 的参考图分工由用户决定**：固定绑定句之后必须接 `$REF_ROLES`（中英成对），内容按 §2.1 提取的用户指定角色逐张写；不得写死「第 1 张锁身份、其余取画风」等默认分工，不得按图片序号臆测用途。
> - 用户未指定分工时，`$REF_ROLES` 只写中性一致性约束（`各参考素材之间主体特征保持一致，不混用不同素材的主体特征` / `keep subject features consistent across references; do not mix subject features from different references`），并在 tips 提示「未指定参考图分工，建议在平台侧逐图设定权重」；显著影响结果时追问一句。
> - 用户要换背景 / 换服装 / 换风格时，把被「保留」的那一项改成具体要求（例：把「保持首帧构图」改为「背景替换为纯白」）。
> - 参考素材上限见 §2.4 / §2.9；超出时在 tips 说明并请用户删减或指定保留项，**不擅自指派分工、不静默截断**；video_inpaint 的「蒙版区域：」后面接用户要求修改的内容（蒙版内主体 + 目标状态）。
> - 前缀与 `$REF_ROLES`、`$MODEL_GUARD` 均计入 §2.9 的官方硬上限。

### 2.9 参数基线快照（按模型 / 变体拆行，数值口径逐项标注）

> 本表是**版本敏感快照**，不是可移植的定值。输出前按实际平台版本与变体复核；`〔官〕` 才可作为硬约束，`〔经验〕` 只能写成调优区间并在 tips 标注「经验值，以实际平台为准」，`〔平台〕`（不暴露 / 未公布 / 按版本而定）一律不得臆造数值。

| 模型 / 变体 | 支持场景 | 时长 | 步数 | CFG | 运动幅度 | 参考素材上限 | 参考权重 | denoise | 官方可查 prompt 上限 |
|---|---|---|---|---|---|---|---|---|---|
| Wan-Video 2.1（T2V / I2V / FLF2V） | 原生 t2v / i2v / flf2v / t2i；v2v / inpaint 需 VACE | 81 帧 ≈5s〔官①〕 | 50（T2V）/ 40（I2V）〔官①〕 | 5.0〔官①〕 | shift 5.0〔官①，按版本核对〕 | 首帧 1 张 / 首尾 2 张〔官①〕 | 〔经验〕0.6-0.8 | 〔经验〕0.4-0.6（VACE） | 512 token（umt5，默认可上调）〔官①〕 |
| Wan-Video 2.2（T2V / I2V / TI2V） | 原生 t2v / i2v；v2v / inpaint 需 VACE | ≈5s〔官①，按版本核对〕 | 〔平台〕按版本默认值 | 〔平台〕按版本默认值 | 〔平台〕按版本默认值 | 首帧 1 张〔官①，按版本核对〕 | 〔经验〕0.6-0.8 | 〔经验〕0.4-0.6 | 512 token（T5-XXL context）〔官①〕 |
| LTX-Video 0.9.7（标准版） | 原生 t2v / i2v / v2v；多条件插值 | 121 帧 ≈5s〔官②，按 fps 核对〕 | 〔经验〕20-30 | 〔经验〕3.0-3.5（+ STG 1.0） | 〔经验〕0.3-0.7 | 0.9.5+ 多图 / 视频插值〔官②〕 | 〔经验〕0.5-0.9 | 〔经验〕0.5-0.9 | T5 默认 128、可调至 512 token〔官②〕 |
| LTX-Video 0.9.7（蒸馏版） | 同上，需自定义 timesteps | 121 帧 ≈5s〔官②，按 fps 核对〕 | 4-10〔官②〕 | **1.0（固定，不启用 CFG）**〔官②〕 | 〔经验〕0.3-0.7 | 0.9.5+ 多图 / 视频插值〔官②〕 | 〔经验〕0.5-0.9 | 〔经验〕0.5-0.9 | T5 默认 128、可调至 512 token〔官②〕 |
| LTX 2.3 / 2.5 | 2.5 起原生多镜头 / 同步音视频 | 〔平台〕按版本核对 | 〔平台〕按版本核对 | 〔平台〕按版本核对 | 〔平台〕按版本核对 | 〔平台〕按版本核对 | 〔平台〕按版本核对 | 〔平台〕按版本核对 | T5 256 + Gemma 512 token（2.3）〔官②〕 |
| MiniMax-H3（海螺 02 / 2.3 系） | 原生 t2v / i2v（首帧 / 首尾帧）/ multi-ref；v2v 为再生成式 | 6s / 10s；1080P 仅 6s〔官③〕 | 〔平台〕不暴露 | 〔平台〕不暴露 | 〔平台〕不暴露 | ≤9 图 / ≤3 视频 / ≤3 音频〔官③，按平台上限核对〕 | 〔平台〕不暴露，按平台逐图设定 | 〔平台〕不暴露 | **2000 字符**（中英文）〔官③〕 |
| HunyuanVideo | 原生 t2v / i2v；multi-ref / v2v / inpaint 扩展 | 129 帧（4k+1）〔官④〕 | 50〔官④〕 | 〔经验〕5.0-7.0（基线 6.0） | 〔经验〕shift 5.0 | 〔平台〕视版本而定 | 〔经验〕0.7-0.9 | 〔经验〕0.3-0.5 | 〔平台〕未公布；按 diffusers `max_sequence_length` 复核 |

**`〔官〕` 依据（公开文档 / 官方仓库可查，改表时按此复核）：**

1. **Wan2.1 / 2.2**：官方 `generate.py` 默认 T2V 50 步 / I2V 40 步、`guide_scale 5.0`、`frame_num 81`、`sample_shift 5.0`；umt5 文本编码器默认 `text_len 512`（可调大），2.2 的 T5-XXL context 为 512 token。
2. **LTX-Video**：官方仓库 / diffusers 文档——0.9.7 蒸馏版 `guidance_scale = 1.0` 且 4-10 步 + 自定义 timesteps；标准版 `guidance_scale 3-3.5` + STG；T5-XXL 默认 128 token 可调至 512；2.3 为 T5 256 + Gemma 512 双编码器；2.5 起原生多镜头与同步音视频；0.9.5+ 支持多条件图 / 视频插值。
3. **MiniMax 海螺 API 文档**：prompt ≤2000 字符（中英文）、duration 6 / 10（1080P 仅 6s）、15 种 `[指令]` 运镜、首帧 / 首尾帧图生视频接口。
4. **HunyuanVideo / diffusers**：固定 129 帧（4k+1）、`num_inference_steps` 默认 50、LLaMA + CLIP 双文本编码器。

> - **口径规则**：`〔官〕` 为官方默认值或不得超出的硬边界，输出时不得改写成区间；`〔经验〕` 写成调优区间并进 tips；`〔平台〕` 按字面输出「平台不暴露 / 未公布 / 按版本核对」，不填数值。
> - **变体不混用**：蒸馏 / Turbo 变体 CFG 恒为 1.0，负向词按 §2.6 处理，不套用同模型标准版的 CFG 与步数。
> - **prompt 上限是硬边界，不是配额或质量拐点**：单位用 token / 字符，不用汉字或词数；只在确实接近上限时触发 §4.2 裁剪；`$REF_CONSTRAINT`（含 `$REF_ROLES`）与 `$MODEL_GUARD` 均计入。
> - 帧数 / fps / 分辨率随平台差异大，按实际默认值填写，不在提示词中出现。
> - >8s 用「上一段末帧接下一段首帧」分段拼接，段长 ≤5s，拼接处光影色调对齐；支持原生长时长 / 多镜头的版本（如 LTX 2.5）不套用此规则。
> - 低分辨率 + 人脸占画面 <1/10 时易人脸融化：裁近主体或缩短帧数。
> - 运动幅度越大越易闪烁，先降幅度再改提示词；平台支持顺序运镜指令时按 §4.3 处理。

## 3. 输出格式 Markdown

```markdown
## 🎬 视频生成提示词结果
任务类型：{{task_type}}
运行模式：{{run_mode}} 【模式A｜模式B1 顺序递进｜模式B2 阶段分镜】
✅ 推荐模型：{{recommend_model}}（{{model_variant}}）｜备选：{{alternative_model}}
理由：{{reason}}
---
### ✅ 正向提示词（中文）
{{ref_constraint_cn}}{{positive_cn}}{{model_guard_cn}}
### ✅ Positive Prompt (English)
{{ref_constraint_en}}{{positive_en}}{{model_guard_en}}
---
### ❌ 负向提示词（中文）
{{negative_cn}}
### ❌ Negative Prompt (English)
{{negative_en}}
---
### ⚙️ API / UI 参数建议（不写入提示词）
- 模型 / 变体：{{model_variant}}
- 建议视频时长：{{video_duration}}
- 采样步数：{{steps}}
- CFG：{{cfg}}
- 运动幅度（shift / motion strength）：{{motion_scale}}
- 参考素材上限：{{ref_limit}}
- 参考素材权重（多参考场景按平台逐图设定）：{{ref_weight}}
- 重绘强度 denoise（V2V / 局部编辑）：{{denoise_strength}}
- 官方可查 prompt 上限：{{prompt_limit}}
- 平台不暴露 / 未公布的参数：{{not_exposed}}
### 📝 模板变量回填明细
$REF_CONSTRAINT：{{ref_constraint_cn}} / {{ref_constraint_en}}
$REF_ROLES：{{ref_roles_cn}} / {{ref_roles_en}}（仅 multi_ref）
$SUBJECT_MOTION：{{subject_motion_cn}} / {{subject_motion_en}}
$ENV_LIGHT：{{env_light_cn}} / {{env_light_en}}
$CAMERA：{{camera_cn}} / {{camera_en}}
$STYLE_QUALITY：{{style_quality_cn}} / {{style_quality_en}}
$MODEL_GUARD：{{model_guard_cn}} / {{model_guard_en}}
### 💡 风险与使用小贴士
{{tips_content}}
```

> - 不适用的小节整节省略；所有 `cn / en` 变量必须成对出现。`$SUBJECT_MOTION` 三种模式均必填，模式A 不再输出 `—` 占位行。
> - 模式B2 的分镜段落写在 `$SUBJECT_MOTION` 内，段间不加时间戳。
> - `{{positive_cn}}` / `{{positive_en}}` 由 `$SUBJECT_MOTION` + `$ENV_LIGHT` + `$CAMERA` + `$STYLE_QUALITY` 按 §2.3 顺序组装；`📝` 回填明细是同一份内容的核对视图，不重复改写。
> - `{{model_guard_cn}}` / `{{model_guard_en}}` 只在正向提示词末尾追加一次（§2.7）。
> - `CFG = 1`（蒸馏 / Turbo 变体）或平台无负向字段时，负向词两节整节省略（§2.6），用户排除项改写为正向排除句并在回填明细标注。

## 4. 排版与长度约束

### 4.1 必备要素

- 模式A：主体 + 可观察动作 + 场景，三项缺一不可。缺则先追问，问不到按默认取值并在 tips 说明。
- 模式B1：主体 + 动作顺序 + 场景。
- 模式B2：主体 + 阶段场景 + 阶段动作。
- **不得堆形容词补足**。

### 4.2 官方硬上限与裁剪

只保留 §2.9 中标注 `〔官〕` 的 prompt 上限，作为「不得超出」的硬边界，**不作配额或质量目标**；单位用 token / 字符，不用汉字或词数。`$REF_CONSTRAINT`（含 `$REF_ROLES`）与 `$MODEL_GUARD` 计入其中。

**仅在确实接近硬上限时**触发裁剪：先裁画质细节 → 材质 → 氛围 → 运镜细节；必须保留主体、动作、场景。裁掉的内容不转入负向词。`〔经验〕` 区间不构成裁剪理由。

### 4.3 排版规则

1. 同分类 ≤3 个（颜色 / 材质 / 光影 / 运镜 / 风格 / 画质）。
2. 运镜全文只给一种镜头运动，禁止同时写 push-in + pan，禁止「cut to / 切镜头」；平台提供原生运镜指令语法时（如 MiniMax 海螺 15 种 `[指令]`，可按文本顺序依次生效）按官方语法书写，同一组 `[]` 内 ≤3 个，但仍不写秒级时间戳、不写「切镜头」。
3. 动作必须显式（呼吸、发丝飘动、缓慢转身）；「平缓」不等于静止，无动作动词易退化为抖动与闪烁。
4. 禁止抽象形容词（"很美"、"非常震撼"、"超现实"），改写为可量化的画面特征。
5. 中英一一对应，单块不混排；中文逗号 / 英文逗号分别分隔各自语言提示词，避免多余换行；品牌、型号、镜头术语保留原文。
6. 不使用 `(word:1.3)` 括号权重语法；强调改用语序前置或独立短句。

### 4.4 模式B 书写规范

- **B1**：动作数 ≤3，写成独立短句 `先…随后…最后…`，禁止塞进同一个从句；主体在多个动作中需有稳定指代，避免用「它 / 他们」跨动作漂移。
- **B2**：段数 ≤3，每段含「主体 + 该段动作 + 该段场景要素」，每段一个主动作；段间不给时间戳，靠「随后 / 接着 / 最后」建立顺序；全局光影、色调、画风、主体一致性由 `$ENV_LIGHT` 与 `$STYLE_QUALITY` 统一声明一次、末段在 `$SUBJECT_MOTION` 内重申一次，段内只写该段特有场景要素，**不得重复全局描述、不得引入新的全局性约束**；强制附带全局统一约束 `全程光影画风统一，禁止突兀跳变` / `keep consistent lighting and art-style through whole video, forbid abrupt jump`（并入 `$SUBJECT_MOTION` 末尾，计入 §2.9 硬上限）。

## 5. 边界与失败模式处理

以下情形的处置原因与替代建议一律写入 tips（完整性只在 §6 第 5 项核对一次）：

1. 需求超出本技能范围（音频 / 剪辑 / 3D 模型导出 / 超分后处理）→ 明确声明本技能仅处理视频生成提示词。
2. 信息不足或需求互斥 → 追问、取默认或保留主需求，冲突项移入负向词；禁止编造与用户描述冲突的主体 / 动作 / 场景。
3. 用户指定模型与能力冲突（时序能力弱、无蒙版接口、素材形态不支持、扩展组件缺失）→ 遵从用户指定，tips 给出风险说明与原生支持的替代模型。

## 6. 输出前自检清单

1. **判定一致性**：场景（§2.1）、时序（§2.2）、模型与变体（§2.5 / §2.9）互相一致；场景与 §2.8 前缀表匹配；`$REF_ROLES` 已按用户指定填写，未擅自指派参考图分工。
2. **正文结构**：按 §2.3 六槽位组装、顺序未打乱、未描述槽位填 `—`；`$SUBJECT_MOTION` 三种模式均必填且中英成对；前缀置于最开头、未复述参考图已有外貌服装配色；`$MODEL_GUARD` 末尾追加且仅一次；B1 / B2 书写规范（§4.4）已满足，B2 已带全局一致约束且段内无重复全局描述。
3. **对齐**：中英语义一一对应（不漏项、不增项，不要求词条数相等）；全文无秒级时间戳；时长、帧率、运动幅度、CFG、步数、分辨率等接口参数未混入提示词文本（§1 / §4.3）。
4. **负向词与参数**：取包（§2.6）与参数基线（§2.9）一致；`〔官〕` 按出处填写、`〔经验〕` 已标区间并进 tips、`〔平台〕` 未臆造；`CFG = 1` 时负向词两节已省略并改写为正向排除句；扩展组件缺失时已改推原生支持的模型。
5. **长度与 tips**：未超 §2.9 官方硬上限，接近时已按 §4.2 裁剪；主体 / 动作 / 场景齐全；§5 触发的处置、时序降级、模型降级、版本复核提示已全部写入小贴士块，不省略。
