# C/C++ 编码规范完整指南

## 一、 项目目录结构规范
合理的项目结构是降低代码耦合度、提升团队协作效率的基础。推荐采用以下标准目录布局：

- **`src/`**：存放项目核心源代码（`.cpp` / `.cc`）及对应的头文件（`.h`）。建议按业务模块进一步划分子目录。
- **`include/`**：存放对外暴露的公共头文件。第三方或外部模块仅需依赖此目录，避免直接引用 `src` 内部实现细节。
- **`thirdpart/`**：存放第三方依赖库的头文件与预编译二进制文件，保持与项目自身代码的物理隔离。
- **`docs/`**：存放项目设计文档、API文档（如 Doxygen 生成结果）、架构图及编译运行指南。
- **`tests/`**：存放单元测试与集成测试代码，确保测试代码与业务代码分离。
- **`build/`**：构建系统生成的临时文件与可执行文件输出目录，需加入版本控制忽略列表（`.gitignore`）。

## 二、 命名规范
清晰的命名是代码可读性的第一道防线。禁止使用拼音或无意义的缩写，所有标识符应准确表达其业务含义。

1. **类与结构体命名**：采用大驼峰命名法（PascalCase），接口类建议以 `Interface` 或 `I` 作为后缀，其它类名称加`C`前缀。
   ```cpp
   //  正确
   class CNetworkManager { };
   class ISerializable { };

   //  错误
   class NetworkManager { };  // 没有C前缀
   class network_manager { }; // 小写加下划线
   class Serialize { };       // 缺乏描述性
   ```

2. **函数命名**：采用大驼峰命名法，动词在前，名词在后。布尔型返回值函数建议使用 `Is`、`Has`、`Can` 等前缀。
   ```cpp
   //  正确
   std::string GetUserInfo(int user_id);
   bool IsValid() const;

   //  错误
   void get_user_info();      // 小写下划线
   bool valid();              // 缺乏动词前缀
   ```

3. **变量命名**：采用小驼峰命名法（camelCase）。成员变量统一添加下划线后缀 `m_`前缀。
   ```cpp
   //  正确
   int retryCount = 0;        // 局部变量
   int user_name_;            // 成员变量

   //  错误
   int RetryCount;            // 大写开头
   int userName;              // 成员变量缺少后缀，易与参数混淆
   ```

4. **常量与宏定义**：全大写并使用下划线分隔。C++ 中优先使用 `const` 或 `constexpr` 替代宏定义。
   ```cpp
   //  正确
   constexpr int MAX_BUFFER_SIZE = 1024;
   #define DEFAULT_TIMEOUT_MS 3000

   //  错误
   const int maxBufferSize = 1024; // 未遵循全大写规范
   ```

## 三、 注释规范
注释的目的是解释“为什么这么做”，而非简单翻译代码逻辑。推荐使用 Doxygen 风格以便自动生成 API 文档。

```cpp
/**
 * @file data_processor.h
 * @brief 数据处理器模块，负责解析和校验原始输入流。
 * @author DevTeam
 * @date 2024-05-20
 */

/**
 * @brief 用户数据管理器，负责处理用户的增删改查。
 * @note 该类不是线程安全的，多线程环境下需外部加锁。
 */
class CUserDataManager 
{
public:
    /**
    * @brief 解析请求参数
    * @param strUrl [out] URL 输出
    * @param strReqJson [out] JSON 请求数据输出
    * @param userObj [in] 用户对象
    * @return true 成功，false 失败
    */
    bool ParseReqParam(string& strUrl, string& strReqJson, 
        const CDispatchUser& userObj);
};

//  函数内注释：仅解释复杂逻辑或非直觉操作
int CalculateHash(const std::string& input) 
{
    // TODO: 张三@company.com - 当前哈希算法性能较差，后续需替换为SHA-256
    return fast_hash(input.c_str()); 
}
```

## 四、 头文件包含顺序
标准化的包含顺序有助于快速定位依赖来源，不同分组之间必须使用空行分隔：

```cpp
#include "data_processor.h"      // 1. 本类/本模块对应头文件

#include <iostream>              // 2. C/C++ 标准库头文件
#include <vector>
#include <string>

#include <boost/asio.hpp>        // 3. 第三方/系统级库头文件
#include <sys/types.h>

#include "utils/logger.h"        // 4. 项目内部头文件
#include "network/socket.h"
```
*强制要求*：头文件中严禁使用 `using namespace xxx;`，必须显式指定命名空间前缀（如 `std::string`）。所有头文件必须使用 `#pragma once` 防止多重包含。

## 五、 接口与变量暴露规则
遵循最小权限原则，严格控制作用域与访问级别，降低模块间的紧耦合。

```cpp
//  正确：严格限制访问权限，优先使用 private
class CDatabaseConnection 
{
private:
    std::string connection_string_; // 私有成员变量
    void InternalValidate();        // 私有辅助函数

protected:
    virtual void OnConnect();       // 仅在确实需要子类扩展时使用 protected

public:
    bool Connect();                 // 仅对外暴露必要的公开接口
};

//  错误：滥用 public，破坏封装性
class CBadConnection 
{
public:
    std::string connStr;            // 数据直接暴露
    void validate();                // 内部逻辑被暴露
};
```

## 六、 代码格式规范
统一的排版风格能显著降低代码审查的认知负荷。

1. **大括号风格（Allman）**：左大括号 `{` 与右大括号 `}` 均独立成行。
2. **空格与留白**：关键字后加空格，运算符前后加空格。
3. **行长限制**：建议每行不超过 **120 个字符**，超长应换行显示。

```cpp
//  正确的格式示例
if (userCount > 0) 
{
    for (size_t i = 0; i < userCount; ++i) 
    {
        ProcessUser(users[i]);
    }
}
else 
{
    LogWarning("No users found");
}

//  错误的格式示例
if(userCount>0){                  // 关键字后缺空格，大括号未换行
    for(size_t i=0;i<userCount;++i){ // 运算符前后缺空格
        ProcessUser(users[i]);}
}else{                            // else 未换行
    LogWarning("No users found");}
```

## 七、 补充核心工程规范
为确保代码的健壮性与安全性，特补充以下关键规则及示例：

1. **内存与资源管理（RAII）**：现代 C++ 严禁裸指针手动 `new/delete`。
   ```cpp
   //  正确：使用智能指针自动管理内存
   auto buffer = std::make_unique<char[]>(MAX_BUFFER_SIZE);
   
   //  错误：手动管理内存，极易导致内存泄漏
   char* buffer = new char[MAX_BUFFER_SIZE];
   delete[] buffer; 
   ```

2. **构造函数职责分离**：构造函数仅做轻量级初始化，复杂或可能失败的操作抽取至 `Init()`。
   ```cpp
   //  正确
   class CFileHandler 
   {
   public:
       explicit CFileHandler(const std::string& path) : file_path_(path) {}
       
       bool Init() 
       {
           // I/O 操作放在这里，失败可以安全返回 false
           return OpenFile(file_path_); 
       }
   private:
       std::string file_path_;
   };

   //  错误：在构造函数中进行复杂的 I/O 操作
   CFileHandler::CFileHandler(const std::string& path) 
   {
       if (!OpenFile(path)) throw std::runtime_error("Failed"); // 构造中抛异常极其危险
   }
   ```

3. **防御性编程与消除魔法数字**：
   ```cpp
   //  正确：具名常量 + 边界检查
   constexpr size_t MAX_RETRY_COUNT = 3;
   if (retryCount < MAX_RETRY_COUNT && ptr != nullptr) 
   {
       SafeExecute(ptr);
   }

   //  错误：魔法数字 + 盲目解引用
   if (retryCount < 3) 
   {
       ptr->Execute(); // 未检查空指针，极易崩溃
   }
   ```

