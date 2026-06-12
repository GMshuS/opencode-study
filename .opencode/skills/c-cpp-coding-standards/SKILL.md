---
name: c-cpp-coding-standards
description: 当进行 C/C++ 代码生成或者要求审查 C/C++ 代码时必须调用。
---

# 核心规范摘要
1. **命名规范**：类加 C 前缀大驼峰，结构体加 T 前缀大驼峰，函数大驼峰，变量小驼峰 + m_ 后缀，常量全大写 + 下划线
2. **代码格式化**：Allman 大括号风格（左大括号独立成行），运算符前后空格，行宽不超过 120 字符
3. **项目目录结构**：遵循 src/include/thirdpart/docs/tests/build 分层组织
4. **内存管理**：优先使用智能指针（C++），遵循 RAII 原则
5. **防御性编程**：消除魔法数字，使用 const/constexpr 替代宏，避免构造函数抛异常
6. **注释规范**：文件头、类、函数添加 Doxygen 风格注释，使用 TODO/FIXME 标记
7. **const 正确性**：参数、成员函数、指针使用 const 限定
8. **头文件规范**：遵循标准包含顺序（本模块→标准库→第三方→项目内部），使用 #pragma once，禁止 using namespace
9. **接口封装**：遵循最小权限原则，优先 private，严格控制作用域

# 完整规范
**强制加载完整规范**，完整规范在技能目录下的[references/c_cpp_coding_standards.md](references/c_cpp_coding_standards.md)