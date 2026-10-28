```markdown
---
name: prompt-generator-videogen
description: 用户需要优化/生成文生视频提示词，解析自然语言需求，输出中英双语正向、负向提示词，输出适配 LTX、Wan‑Video、MinMax‑H3、HunyuanVideo 的模板填充结果、模型推荐、运行参数、场景模式判定。支持：文生视频、首帧图生视频、多参考图生视频、视频生视频V2V、视频局部编辑inpaint‑video等。
---
## 1. 技能定位
接收用户自然语言视频需求，自动识别生成场景，选择**模式A（全程静态平缓动态，无时序）/模式B（时序分镜脚本）**，基于变量模板拆解用户输入，输出中英双语正负提示词，给出首选/备选视频模型、API/UI参数基线、模板变量回填明细。
> 本技能仅做提示词文本编排；参考图、参考视频、蒙版、权重、运动幅度motion_scale、时长、帧率、分辨率均属于平台/API入参，**不写入提示词文本**，仅在参数区输出建议值。

## 2. 解析流程
### 2.1 场景模式识别（按顺序命中判定）
1. 含「局部修改、改某个物体、只改这块、视频编辑」 → `video_inpaint` 视频局部编辑
2. 含「输入视频、保留原有动作、重绘视频、v2v」 → `video2video` 视频生视频
3. 含「多张参考图、多图参考、参考图1参考图2」 → `multi_ref_img2video` 多参考图生视频
4. 含「首帧、以这张图开始动、图生成视频」 → `firstframe_img2video` 首帧图生视频
5. 其余纯文本生成视频 → `text2video` 文生视频

> 时序开关判定逻辑：
> 用户输入包含时间分段描述（0‑2s、1~3秒、分镜、先后动作变化）：
> - 模型为 HunyuanVideo：启用 `模式B 时序脚本`
> - 模型为 MinMax‑H3：启用 `模式B(轻度时序)`，自动增加约束：仅柔和渐变，禁止主体/场景强切换
> - 模型为 LTX / Wan：强制降级为 `模式A`，小贴士告知“该模型不支持复杂时序，已转为全程平缓动态模式”
> 用户没有输入时间分段：统一使用 `模式A`

### 2.2 字段拆解（解析用户需求填入对应变量）
模板变量集合：
1. `$REF_CONSTRAINT`：场景参考约束（根据2.1识别的场景自动生成中英双语约束前缀）
2. `$TIME_SCRIPT`：时序脚本；模式A填`无`；模式B填入分时脚本内容（中英成对）
3. `$SUBJECT_ACTION`：主体+持续平缓动作（模式A必填；模式B写入时序脚本内部，此字段填—）
4. `$ENV_LIGHT`：环境背景、天气、光影色调
5. `$STYLE_QUALITY`：画质、画风、材质细节
6. `$CAMERA`：运镜文字描述（仅语义描述，不是参数；禁止同时堆砌多种运镜）
7. `$MODEL_GUARD`：模型专属稳定防护语句（中英双语，查表获取）

> 规则：
> - 用户没有描述的字段填 `—`，不为凑格式强行增加关键词
> - 用户明确不想要的画面问题，统一归入负向提示词
> - img2video / video2video / video_inpaint 不编造参考素材不存在的物体特征，约束语句必须放在提示词开头
> - 提示词内禁止写入：时长、fps、motion_scale、cfg、采样步数、分辨率，全部挪至参数建议区

### 2.3 模型推荐决策表
| 需求特征 | 首选模型 | 备选模型 | 推荐理由 |
|---|---|---|---|
| 二次元、风格化画面，追求画面风格表现力，尽量少人物强叙事 | LTX | Wan‑Video | 风格渲染强；物体一致性尚可；时序能力弱，优先单状态平缓动态 |
| 快速生成，注重画面稳定性，抑制闪烁抖动，通用写实/二次元都可 | Wan‑Video | LTX | 视频稳定性优秀；对剧烈运动、时序切换敏感；尽量避免时序脚本 |
| 写真、氛围感、光影材质要求高，多参考图场景，柔和渐变小叙事 | MinMax‑H3 | HunyuanVideo | 光影材质表现优秀；支持轻度时序，不能做大幅度场景主体切换 |
| 人物叙事、连贯表情动作、需要时序分镜脚本、剧情向短片 | HunyuanVideo | MinMax‑H3 | 时序脚本理解能力最强，人物面部表情动作连贯性最好；长视频仍会有闪烁风险 |

冲突消解规则（顺序判定，命中即停止）
1. 用户明确给出模型名称 → 首选=用户指定，备选写无，理由：用户指定模型
2. 需要时序分镜、剧情多阶段动作变化 → 首选 HunyuanVideo；备选 MinMax‑H3；LTX/Wan不做首选，提示风险
3. 多参考图保人设保画风场景 → 首选 MinMax‑H3；备选 HunyuanVideo
4. 强风格化二次元，无复杂人物叙事 → 首选 LTX；备选 Wan‑Video
5. 追求最低闪烁抖动，不要求时序剧情 → 首选 Wan‑Video；备选 LTX
6. 跨2类以上需求：输出首选+备选，写明取舍风险

### 2.4 负向提示词包（中英双语，按场景取用，禁止自行编造新词）
> 通用视频基础负面包（全部模型基础包）
| | 中文 | English |
|---|---|---|
| video‑base | 扭曲肢体，畸形，多手指，缺手指，面部崩坏，五官错乱，闪烁，画面剧烈抖动，频闪，撕裂，重影，水印，文字，logo，模糊，低画质，噪点，变形，崩坏，穿模，肢体穿插，跳帧，忽明忽暗 | distorted limbs, malformation, extra fingers, missing fingers, broken face, distorted facial features, flicker, violent camera shake, strobing, tearing, ghosting, watermark, text, logo, blurry, low quality, noise, deformation, corruption, penetration artifacts, limb interpenetration, frame skipping, abrupt brightness fluctuation |

> 模型追加负面补充（拼接在基础包之后）
|模型|中文追加|English append|
|---|---|---|
| Wan‑Video | 画面频闪，物体形态突变 | strobing light, abrupt object shape mutation |
| LTX | 主体特征丢失，物体无故变形 | loss of subject identity, unmotivated object deformation |
| MinMax‑H3 | 光影跳变，材质割裂 | abrupt lighting shift, inconsistent material texture |
| HunyuanVideo | 表情跳变，五官随帧改变 | jumping expression, facial feature changing frame by frame |

> 场景追加补充
|场景|中文追加|English append|
|---|---|---|
| video_inpaint局部编辑 | 修改区域边缘错位，融合不自然 | misaligned edge on edited area, unnatural blending |
| multi_ref_img2video多参考 | 人物样貌跳变，画风频繁切换 | character appearance shifting, frequent style switching |

### 2.5 $MODEL_GUARD 模型防护词对照表（中英成对，填入提示词末尾）
|模型|中文防护语句|English guard prompt|
|---|---|---|
| Wan‑Video | 画面稳定，抑制频闪，动作平缓，避免剧烈形变，不要大幅度突变 | Stable image, suppress strobing, gentle motion, avoid severe deformation, no large abrupt changes |
| LTX | 物体一致性优先，缓慢变化，减少画面闪烁，主体特征全程保留 | Prioritize object consistency, slow subtle changes, reduce flickering, preserve subject features throughout video |
| MinMax‑H3 | 光影过渡柔和，材质质感连贯，人脸保持稳定，小幅度渐变优先 | Soft lighting transition, coherent material texture, stable human face, prioritize small gradual changes |
| HunyuanVideo | 面部稳定，表情连贯，动作叙事流畅，支持柔和时序变化 | Stable facial features, coherent expression, smooth motion and narration, support soft temporal transition |

### 2.6 参数基线快照（属于API/界面参数，**不进提示词**，输出到参数建议块）
> 说明：motion_scale运动幅度、参考图权重、denoise重绘强度、seed均为接口参数，不在prompt文本中出现。

|模型|支持场景|推荐视频时长|motion_scale运动幅度基线|CFG|参考图权重|备注|
|---|---|---|---|---|---|---|
| Wan‑Video | t2v / img2v / v2v | 4‑6s | 0.3‑0.6 | 4.0‑6.0 | 0.6‑0.8 | 不建议开启复杂时序 |
| LTX | t2v / img2v / v2v | 4‑6s | 0.2‑0.5 | 3.5‑5.5 | 0.6‑0.85 | 风格强，物体易漂移 |
| MinMax‑H3 | t2v / img2v / multi‑ref / v2v | 5‑7s | 0.4‑0.7 | 3.0‑5.0 | 0.7‑0.9 | 多参考图表现优秀；仅支持轻度时序 |
| HunyuanVideo | t2v / img2v / multi‑ref / v2v / video_inpaint | 5‑8s | 0.4‑0.8 | 3.5‑5.0 | 0.7‑0.9 | 时序脚本支持最好，超过8秒闪烁风险上升 |

> 模式前缀中英对照（$REF_CONSTRAINT 自动生成）
1. `text2video`：无前缀
2. `firstframe_img2video`
> 中：`严格参考首帧画面构图、人物五官、服装造型，主体不变，只增加平缓动态，`
> 英：`Strictly refer to first‑frame composition, facial features and costume; keep subject unchanged, only add gentle dynamics,`
3. `multi_ref_img2video`
> 中：`参考图1锁定人物面部外形，参考图2锁定场景，参考图3锁定画风色调，主体特征保持一致，样貌不变，`
> 英：`Reference‑1 lock character face and appearance, Reference‑2 lock scene environment, Reference‑3 lock art‑style and color tone; keep subject identity consistent, appearance unchanged,`
4. `video2video`
> 中：`保留原视频全部动作、镜头轨迹、构图不变，仅重绘画面风格材质光影，动作时序不变，`
> 英：`Preserve all original video motion, camera track and composition; only redraw style, material and lighting; keep motion timing unchanged,`
5. `video_inpaint`
> 中开头：`画面其余所有元素、构图、人物、动作、光影色调全部保持不变，仅修改蒙版选中视频区域；蒙版区域：`
> 中结尾：`光影与原视频光源统一，边缘柔和自然，无缝融合，透视匹配原视频`
> 英开头：`All other elements, composition, character, motion, lighting and tone remain unchanged; only modify masked video area; Mask area:`
> 英结尾：`Light source consistent with original video, soft natural edge, seamless blending, perspective matches source video`

## 3. 输出格式 Markdown
```markdown
## 🎬 视频生成提示词结果
任务类型：{{task_type}}
运行模式：{{run_mode}} 【模式A｜模式B(轻度时序)｜模式B(完整时序)】
✅ 推荐模型：{{recommend_model}}｜备选：{{alternative_model}}
理由：{{reason}}
---
### ✅ 正向提示词（中文）
{{positive_cn}}
### ✅ Positive Prompt (English)
{{positive_en}}
---
### ❌ 负向提示词（中文）
{{negative_cn}}
### ❌ Negative Prompt (English)
{{negative_en}}
---
### ⚙️ API / UI 参数建议（不写入提示词）
- 建议视频时长：{{video_duration}}
- motion_scale运动幅度：{{motion_scale}}
- CFG：{{cfg}}
- 参考图权重（图生视频场景）：{{ref_weight}}
- 重绘强度 denoise（V2V/局部编辑）：{{denoise_strength}}
### 📝 模板变量回填明细
$REF_CONSTRAINT：{{ref_constraint_val}}
$TIME_SCRIPT：{{time_script_val}}
$SUBJECT_ACTION：{{subject_action_val}}
$ENV_LIGHT：{{env_light_val}}
$STYLE_QUALITY：{{style_quality_val}}
$CAMERA：{{camera_val}}
$MODEL_GUARD：{{model_guard_val}}
### 💡 风险与使用小贴士
{{tips_content}}
```

## 4. 排版与长度约束
1. 同一类关键词不超过4个；时序脚本分段不受该限制
2. 中英语义一一对应，禁止中英混写在同一个提示词块内；镜头专有名词保留原文
3. 使用中文逗号、英文逗号分别分隔各自语言提示词，避免多余无效换行
4. 不使用 `(word:1.3)` 括号权重语法，现代视频模型优先字面语义解析
5. 提示词长度预算
|模型|正向提示词文本长度上限|
|---|---|
| Wan‑Video | ≤180汉字 |
| LTX | ≤200汉字 |
| MinMax‑H3 | ≤250汉字 |
| HunyuanVideo | ≤400汉字（时序脚本允许更长） |

## 5. 边界与失败模式处理
1. 用户需求包含音频、剪辑、3D模型导出、超分后处理 → 在tips明确说明：本skill仅处理视频生成提示词，不处理该部分能力
2. 用户输入互斥画面需求，保留主需求，冲突项移入负向词，tips写明取舍
3. 信息不足时可以合理补通用修饰，禁止编造与用户描述冲突的主体、动作、场景
4. 用户强制给模型做超出能力的任务（例如给Wan要求复杂多段时序脚本）：遵从用户指定模型，同时在tips写明风险：该模型时序能力弱，容易出现跳变、闪烁、主体丢失，建议切换 HunyuanVideo / MinMax‑H3
5. 模式B时序脚本必须强制增加全局约束：全程光影画风统一，禁止突兀跳变（英文：keep consistent lighting and art‑style through whole video, forbid abrupt jump）

## 6. 输出前自检清单
1. task_type场景识别与2.1判定顺序一致
2. $REF_CONSTRAINT 中英约束前缀已经正确添加，图生视频/V2V/inpaint场景前缀放置提示词最开头
3. 如果是模式B，时序脚本块完整，并且附带全局统一画风光影约束
4. 正负提示词中英成对，语义对齐，没有混入时长、帧率、motion_scale等接口参数
5. 参数基线与2.6表格匹配；图生视频/V2V场景补全参考权重/denoise参数
6. 模型防护词$MODEL_GUARD已经追加到正向提示词末尾
7. 存在风险点必须写入小贴士块，不省略风险提示