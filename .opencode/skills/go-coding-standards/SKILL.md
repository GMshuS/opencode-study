---
name: go-coding-standards
description: 当进行 Go 代码生成或者要求审查 Go 代码时必须调用。
---

# 核心规范摘要
1. 遵循标准项目结构（App/internal/pkg/clib 分层）
2. 遵循 `gofmt` 格式化规则（Tab 缩进、空格、换行）
3. 使用有意义的命名（驼峰式、包名小写）
4. 错误处理优先（不丢弃错误、fmt.Errorf 包装、慎用 panic）
5. 导入包规范：标准库 → 第三方库 → 项目内部包，使用 `goimports` 自动管理
6. 遵循注释规范（包注释、结构/接口注释、函数/方法注释）
7. 合理使用 goroutine 和 channel
8. 避免 goroutine 泄漏
9. 使用 `gofmt` 进行强制格式化，配合 `goimports` 管理导入

# 完整规范
**强制加载完整规范**，完整规范在技能目录下的[references/go_coding_standards.md](references/go_coding_standards.md)
