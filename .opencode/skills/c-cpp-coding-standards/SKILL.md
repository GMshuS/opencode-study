---
name: c-cpp-coding-standards
description: 当进行 C/C++ 代码生成或者要求审查 C/C++ 代码时调用。
---

# 核心规范摘要
1. **命名规范**：变量使用 snake_case，函数/类使用 PascalCase，常量使用全大写 + 下划线
2. **代码格式化**：4 空格缩进，行宽不超过 120 字符
3. **项目目录结构**：遵循 APP/Script/Bin/Libs 分层组织，支持多应用模块
4. **内存管理**：优先使用智能指针（C++），遵循 RAII 原则
5. **错误处理**：使用异常或错误码，保持统一
6. **注释规范**：文件头、类、函数添加 Doxygen 风格注释，使用 TODO/FIXME 标记
7. **const 正确性**：参数、成员函数、指针使用 const 限定
8. **工具链**：使用 clang-tidy 静态分析，clang-format 格式化，Visual Studio 构建

# 完整规范
**强制加载完整规范**，完整规范在技能目录下的[references/c_cpp_coding_standards.md](references/c_cpp_coding_standards.md)