# C/C++ 编码规范完整指南

## 目录
- [命名规范](#命名规范)
- [代码格式化](#代码格式化)
- [代码组织](#代码组织)
- [内存管理](#内存管理)
- [错误处理](#错误处理)
- [注释和文档](#注释和文档)
- [最佳实践](#最佳实践)
- [安全检查清单](#安全检查清单)

---

## 命名规范

### 变量命名
- 使用小写字母和下划线（snake_case）
- 变量名应具有描述性
- 避免使用单个字母（除循环计数器 i、j、k 外）

```cpp
// 好
int user_count;
double total_price;

// 不好
int UC;
double tp;
```

### 函数命名
- 使用 **PascalCase**
- Getter/Setter 方法：使用 `Get`/`Set` 前缀

```cpp
class CConfigCenter
{
public:
    bool Init();
    void UnInit();
    
    unsigned int GetMaxLenLog() { return m_nMaxLenLog; }
    unsigned int GetHttpTimeout() { return m_nHttpTimeOut; }
    const string& GetHttpAddr() { return m_strHttpAddr; }
};
```

### 类命名
- 使用 **PascalCase**（大驼峰命名法）
- 类名前可加 `C` 前缀表示 Class（可选但需保持一致）

```cpp
class CConfigCenter
class CMessageDispatcher
class CJyMaMessageDispatcher
```

### 常量命名
- 全部大写，使用下划线分隔

```cpp
const int MAX_BUFFER_SIZE = 1024;
constexpr double PI = 3.14159;
```

### 宏命名
- 全部大写，使用下划线分隔
- 添加项目前缀避免冲突

```cpp
#ifndef MYPROJECT_CONFIG_H
#define MYPROJECT_CONFIG_H
#endif
```

### 枚举命名
- 枚举类型：PascalCase
- 枚举值：PascalCase 或全大写 + 下划线

```cpp
enum TRADESTRATEGYERROR
{
    TRADESTRATEGYERROR_BEGIN = 1010000,
    TRADESTRATEGYERROR_LOGIN,
    TRADESTRATEGYERROR_END
};
```

---
## 代码格式化

### 缩进
- 使用 **4 个空格** 进行缩进（不使用 Tab）
- 保持代码对齐一致

```cpp
class CConfigCenter
{
public:
    CConfigCenter();          // 正确：4 空格缩进
    virtual ~CConfigCenter();
    
    bool Init()
    {
        if (condition)        // 正确：8 空格缩进
        {
            // 代码块
        }
    }
};
```
### 行长限制
- 建议每行不超过 **120 个字符**
- 超长字符串应分段拼接

```cpp
// 错误：行太长
strUrl = CConfigCenter::GetInstance()->GetHttpAddr() + "?TENANT_ID=" + CConfigCenter::GetInstance()->GetTenantID() + "&TOKEN=" + CConfigCenter::GetInstance()->GetToken();

// 正确：分段拼接
strUrl = CConfigCenter::GetInstance()->GetHttpAddr();
strUrl += "?TENANT_ID=" + CConfigCenter::GetInstance()->GetTenantID(); 
strUrl += "&TOKEN=" + CConfigCenter::GetInstance()->GetToken();  
strUrl += "&SERVICE=" + strService;
```

### `{`与`}`单独成行
- 函数、类、条件语句等的`{`与`}`应单独成行

```cpp
// 错误
if (condition) {
    // 代码块
}

// 正确
if (condition)
{
    // 代码块
}
```

---

## 代码组织

### 项目目录结构

注意：**存量项目已经有项目结构时无需遵守此规范，按照已有项目结构组织代码**

项目目录结构示例：
```
project/
├── APP1/                           # 应用模块1
│   ├── include/                    # 应用模块1的头文件目录
│   ├── src/                        # 应用模块1的源文件目录
│   ├── CMakeLists.txt/             # 应用模块1的 CMake 构建文件
├── APP2/                           # 应用模块2
│   ├── include/                    # 应用模块2的头文件目录
│   ├── src/                        # 应用模块2的源文件目录
│   ├── Libs/                       # 应用模块2的私有库文件目录
│   ├── CMakeLists.txt/             # 应用模块2的 CMake 构建文件
├── Script/                         # 脚本文件目录（sql、bat、shell等）
│   ├── APP2/                       # 应用模块2的脚本
│   ├── APP1/                       # 应用模块1的脚本
├── Bin/                            # 应用模块编译输出可执行文件目录
│   ├── libs_linux_debug/           # 应用模块的公共库文件目录（调试版本）
│   ├── libs_linux_release/         # 应用模块的公共库文件目录（发布版本）
│   ├── linux_debug/                # linux应用模块编译输出可执行文件目录（debug版本）
│   │   ├── config/                 # 应用模块依赖的配置文件目录
│   ├── linux_release/              # linux应用模块编译输出可执行文件目录（release版本）
│   │   ├── config/                 # 应用模块依赖的配置文件目录
│   └── win_debug/                  # windows应用模块编译输出可执行文件目录（debug版本）
│   │   ├── config/                 # 应用模块依赖的配置文件目录
│   └── win_release/                # windows应用模块编译输出可执行文件目录（release版本）
│   │   ├── config/                 # 应用模块依赖的配置文件目录
│   └── script/                     # 应用管理脚本文件目录（bat、shell等，用于启动、停止、重启应用模块）
├── Libs/                           # 公共库文件目录
│   ├── Common/                     # Common公共库
│   └── ├── include/                # Common公共库头文件目录
│   └── ├── src/                    # Common公共库源文件目录
│   ├── Json/                       # Json公共库
│   │   ├── include/                # Json公共库头文件目录
│   │   ├── src/                    # Json公共库源文件目录
│   │   ├── lib/                    # Json公共库文件目录
│   │   │   ├── win32/              # Json公共库文件目录（win32）
│   │   │   ├── win64/              # Json公共库文件目录（win64）
│   ├── TinyXml/                    # TinyXml公共库
│   │   ├── include/                # TinyXml公共库头文件目录
│   │   ├── src/                    # TinyXml公共库源文件目录
│   │   ├── lib/                    # TinyXml公共库文件目录
│   │   │   ├── win32/              # TinyXml公共库文件目录（win32）
│   │   │   ├── win64/              # TinyXml公共库文件目录（win64）
```

### 头文件保护
```cpp
// 推荐使用 #pragma once（现代编译器）
#pragma once

// 或使用传统宏保护
#ifndef MODULE_NAME_H
#define MODULE_NAME_H
#endif
```

### 包含顺序
```cpp
// 1. 对应的头文件
// 2. 标准库
// 3. 第三方库
// 4. 项目内部头文件

#include "module_name.h"
#include <iostream>
#include <vector>
#include <boost/algorithm/string.hpp>
#include "other_module.h"
```

---

## 内存管理

### C++ 优先使用智能指针
```cpp
// 推荐
std::unique_ptr<Resource> ptr = std::make_unique<Resource>();
std::shared_ptr<Data> data = std::make_shared<Data>();

// 不推荐
Resource* ptr = new Resource();
delete ptr;
```

### RAII 原则
```cpp
class FileHandler
{
public:
    FileHandler(const std::string& path) : file_(std::fopen(path.c_str(), "r")) {}
    ~FileHandler() { if (file_) std::fclose(file_); }
    
private:
    FILE* file_;
};
```

### C 语言内存管理
```c
// 分配后立即检查
void* ptr = malloc(size);
if (ptr == NULL)
{
    // 错误处理
    return;
}

// 确保每个 malloc 都有对应的 free
free(ptr);
ptr = NULL;  // 避免悬空指针
```

---

## 错误处理

### C++ 异常处理
```cpp
// 使用标准异常
throw std::invalid_argument("Invalid argument");
throw std::runtime_error("Runtime error");

// 异常安全的函数
void process() noexcept;  // 不抛出异常
```

### C 语言错误码
```c
// 返回错误码
int result = function();
if (result != 0)
{
    // 错误处理
}

// 或使用 errno
#include <errno.h>
if (errno != 0)
{
    perror("Error");
}
```

---

## 代码注释

### 文件头注释
每个源文件开头应包含简要说明（当前项目中较少，建议添加）

```cpp
/**
 * @file ConfigCenter.cpp
 * @brief 配置中心实现
 * @author YourName
 * @date 2026/03/10
 */
```

### 类注释
类定义前应有功能说明

```cpp
// 配置中心类 - 负责加载和管理配置文件
class CConfigCenter
{
    // ...
};
```

### 函数注释
复杂函数应说明功能、参数和返回值

```cpp
/**
 * @brief 解析请求参数
 * @param strUrl [out] URL 输出
 * @param strReqJson [out] JSON 请求数据输出
 * @param userObj [in] 用户对象
 * @return true 成功，false 失败
 */
bool ParseReqParam(string& strUrl, string& strReqJson, 
                   const CDispatchUser& userObj);
```

### 行内注释
- 使用 `//` 进行单行注释
- 注释前留一个空格
- 解释"为什么"而不是"是什么"

```cpp
// 正确：解释原因
if (atoi(szSubMode) != -1)  // -1 表示禁用模式
{
    // 启动推送 Worker
}
```

### TODO/FIXME 注释
使用标准标记标注待办事项

```cpp
// TODO: 优化日志记录性能
// FIXME: 此处可能存在内存泄漏
// NOTE: 注意配置文件的编码格式
```

---

## 最佳实践

### const 正确性
```cpp
// 参数
void process(const Data& data);

// 成员函数
int getValue() const;

// 指针
const int* ptr;      // 指向常量的指针
int* const ptr;      // 常量指针
const int* const ptr; // 指向常量的常量指针
```

### 引用优于指针（C++）
```cpp
// 推荐
void process(Data& data);

// 不推荐
void process(Data* data);
```

### 使用 auto（C++11+）
```cpp
// 推荐：类型明显时
auto it = vec.begin();
auto ptr = std::make_unique<Resource>();

// 不推荐：类型不明显时
auto result = complexFunction();  // 应该显式声明类型
```

### 避免魔法数字
```cpp
// 不好
if (status == 3) { ... }

// 好
constexpr int STATUS_READY = 3;
if (status == STATUS_READY) { ... }
```

---

## 安全检查清单

### 代码审查清单
- [ ] 变量命名是否有意义且符合规范
- [ ] 函数是否单一职责
- [ ] 是否有内存泄漏风险
- [ ] 错误处理是否完整
- [ ] 是否有必要的注释
- [ ] 是否使用了适当的容器和算法
- [ ] 是否有潜在的未定义行为

### 常见安全问题
- [ ] 缓冲区溢出检查
- [ ] 整数溢出检查
- [ ] 空指针检查
- [ ] 资源泄漏检查
- [ ] 竞态条件检查

### 性能检查
- [ ] 避免不必要的拷贝（使用 const 引用）
- [ ] 使用移动语义（C++11+）
- [ ] 预分配容器大小
- [ ] 避免在循环中重复计算

---

## 工具推荐

### 静态分析
- clang-tidy
- cppcheck

### 格式化
- clang-format
- astyle

### 构建系统
- Visual Studio（推荐）
- CMake
