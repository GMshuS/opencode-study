# img2img / inpaint 编辑结构

本文件仅在 `task_type = img2img` 或 `inpaint` 时加载。共享规则见主文件 `../SKILL.md`。

## 1. 核心原则

编辑提示词描述的是「改动」，不是「一幅画面」。三段顺序固定：

1. **约束锚点**（段 1）：以原图哪些内容为基准
2. **变更项**（段 2）：本次要改的东西
3. **一致性约束**（段 3，仅 `inpaint`）：与周围画面融合

先抽出用户的变更项，再据此选锚点；不套固定模板、不在模板上打补丁。不套用 `txt2img` 的三类结构，不填「📝 拆解明细」。

### 为什么不用绝对化措辞

- 扩散模型的文本编码器擅长表达「要什么」，不擅长执行「不要改什么」；`只 / 仅 / 全部不变` 之类排他词既约束不住，又会占住靠前 token 把真正的画面描述压到后面。
- 真正决定「保留多少原图」的是 `denoise` 与蒙版，不是文本。锚点句只是软约束。
- 固定写「保留构图」在换背景 / 换姿势时是错的 —— 构图本来就会变。

因此：**用「以…为基准 / 与…一致 / 延续原图」替代「不变 / 保持不变」，直接删掉「只 / 仅 / only」；用户「不要改 X」走负面词（主文件 §2.4）。**

## 2. 段结构与中英对照

段内逗号、段间分号（主文件 §4.1）；分号数 = 实际段数 − 1，`img2img` 通常为 1 个，`inpaint` 为 2 个。禁止句尾分号。

### 2.1 `img2img`

| 情形 | 段 1 锚点 | 段 2 变更项 |
|---|---|---|
| 换画风 / 色调 / 整体质感 | 中 `以原图构图、主体位置与相机视角为基准，光源方向与原图一致；`<br>英 `based on the original composition, subject placement and camera angle, with light direction consistent with the original;` | `水彩画风，暖黄色调，纸张纹理`<br>`watercolor style, warm yellow tone, paper texture` |
| 换背景 / 换服装 / 换姿势 | 中 `以原图主体、姿势与相机视角为基准；`<br>英 `based on the original subject, pose and camera angle;` | `背景替换为纯白，主体光影与环境光统一`<br>`background changed to pure white, subject lighting unified with the ambient light` |
| 仅提升质感 / 清晰度 | 中 `以原图全部内容为基准；`<br>英 `based on the full content of the original image;` | `提升皮革纹理与细节清晰度，构图与配色延续原图`<br>`enhanced leather texture and fine detail, composition and palette continuing the original` |

> 换背景 / 换姿势时，锚点**不要**写「保留构图」；按上表改用「主体、姿势、相机视角」。

### 2.2 `inpaint`

| 段 | 中文 | English |
|---|---|---|
| 1 锚点 | `以原图构图、光影与色调为基准；` | `based on the original composition, lighting and tone;` |
| 2 变更项 | `{区域}改为{目标状态}；`（可追加可观察的局部锚点，如 `地平线位置延续原图`） | `the {area} becomes {target state};` |
| 3 融合 | `与周围光影统一，边缘自然融合，透视与原图一致` | `lighting consistent with the surroundings, natural edges, perspective matching the original` |

> - 不写「其余元素全部不变」：平台本来就只重算蒙版区域，这是冗余指令。
> - 不用 `Mask area:` 之类标签，避免中英混排；区域直接写进段 2。
> - 用户点名了具体元素即使没明说区域，也算可定位，直接写进段 2。

### 2.3 完整示例

```text
【换背景】以原图主体、姿势与相机视角为基准；背景替换为纯白，主体光影与环境光统一
based on the original subject, pose and camera angle; background changed to pure white, subject lighting unified with the ambient light

【局部重绘】以原图构图、光影与色调为基准；天空改为晚霞，地平线位置延续原图；与周围光影统一，边缘自然融合，透视与原图一致
based on the original composition, lighting and tone; the sky becomes sunset clouds, horizon line continuing the original; lighting consistent with the surroundings, natural edges, perspective matching the original
```

## 3. 措辞替换表

| 避免 | 改用 |
|---|---|
| 只调整 / only change | 直接写目标：`改为水彩画风` |
| 全部不变 / remain unchanged | `延续原图` / `continues the original` |
| 仅修改 / only modify | `修改区域` / `edit area` |
| 保持不变 / keep unchanged | `与…一致` / `consistent with` |
| 必须 / must | 删除，靠 denoise 与语序 |
| 不要改变 / do not change | 移入负面词（主文件 §2.4），或交给蒙版 |
| 保留构图（固定写法） | 按变更项动态选锚点 |

## 4. denoise 联动（仅 `img2img`）

`img2img` 下 `denoise` 才真正决定保留程度（取值见主文件 §2.5）：

| denoise | 锚点句处理 |
|---|---|
| 低（约 <0.55） | 可极简甚至省略段 1，参数已保证相似，正文只写变更项 |
| 中（约 0.55~0.7） | 写一句基准锚点 + 变更项 |
| 高（约 >0.7） | 文本约束效果有限，**不要把锚点句写得更强**；在 tips 提示降低 denoise 或改走 `inpaint` |

> `inpaint` 的基线 denoise 本就落在 0.75~0.9（蒙版区域需充分重绘），其余区域由蒙版保证保留，
> **不套用上表**，也不因 denoise 较高而弱化锚点句或额外告警。

## 5. 组装与输出规则

- 不描述原图已有的主体外观特征，不编造图中没有的元素；主体只写类别词或「原图主体」。
- 用户要换背景 / 换服装 / 换姿势时，把该项写成具体要求，同时按本文档 §2.1 的对应关系调整锚点。
- 用户明确不要的元素移入负面词（主文件 §2.4），不写进段 1。
- 正向提示词三段拼好后整体填入主文件 §3 的 `{{positive_cn}}` / `{{positive_en}}`，模板不设独立前后缀槽位。
- 填「📝 编辑明细」三行：保留锚点 / 变更项 / 一致性约束；`img2img` 的「一致性约束」、以及低 denoise 下省略段 1 时的「保留锚点」均记 `—`。
- 参数建议中 `denoise` 必填；`inpaint` 用 inpaint 专属的 denoise 区间。
- MOSS-Image 仅支持 t2i，本文件两种模式都不选它。
