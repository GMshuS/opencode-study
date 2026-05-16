---
name: go-coding-standards
description: 当进行 Go 代码生成或者要求审查 Go 代码时调用。
---

# 核心规范摘要
1. 遵循标准项目结构（App/internal/pkg/clib 分层）
2. 遵循 `go fmt` 格式化规则（缩进、空格、换行）
3. 使用有意义的命名（驼峰式、包名小写）
4. 错误处理优先（错误作为返回值、及时检查）
5. 使用 `defer` 进行资源清理
6. 遵循简洁的注释规范（包注释、函数注释）
7. 合理使用 goroutine 和 channel
8. 避免 goroutine 泄漏
9. 使用 `go vet` 和 `staticcheck` 进行静态分析

# 完整规范
**强制加载完整规范**，完整规范在技能目录下的[references/go_coding_standards.md](references/go_coding_standards.md)
