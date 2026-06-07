---
name: language-detect
description: 通过项目文件自动检测编程语言并加载对应的编码规范技能。
---

# 语言自动探测 Skill

扫描项目根目录的配置文件和源文件，自动检测编程语言，
并加载对应的编码规范 skill。

## 探测规则

- `package.json` / `tsconfig.json` / `*.js` / `*.ts` / `*.tsx` / `*.jsx`
  → **JavaScript/TypeScript** → 加载 `javascript-coding-standards`
- `setup.py` / `pyproject.toml` / `requirements.txt` / `*.py`
  → **Python** → 加载 `python-coding-standards`
- `go.mod` / `go.sum` / `*.go`
  → **Go** → 加载 `go-coding-standards`
- `CMakeLists.txt` / `Makefile` / `*.c` / `*.cpp` / `*.h` / `*.hpp` / `*.cc` / `*.cxx`
  → **C/C++** → 加载 `c-cpp-coding-standards`

## 多语言项目

若项目同时匹配多种语言特征（如同时存在 `package.json` 和 `pyproject.toml`），
按检测到的所有语言分别加载对应的 skill。

## 无法匹配

若无法匹配任何已知语言，仅执行通用维度的审查/处理，不加载编码规范 skill。
