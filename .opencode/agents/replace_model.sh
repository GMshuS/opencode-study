#!/bin/bash

# ====================== 配置与参数校验 ======================
if [ $# -ne 2 ]; then
    echo "用法：$0 【目标文件目录】 【新的model字符串】"
    echo "示例：$0 ./dev-flow opencode/deepseek-v4-flash"
    exit 1
fi

TARGET_DIR="$1"
NEW_MODEL_STR="$2"

if [ ! -d "$TARGET_DIR" ]; then
    echo "错误：目录 [$TARGET_DIR] 不存在！"
    exit 1
fi

echo "============================================="
echo "目标目录：$TARGET_DIR"
echo "替换后 model 值：$NEW_MODEL_STR"
echo "============================================="

# ====================== 区分Linux/macOS sed ======================
if [[ "$(uname -s)" == "Darwin" ]]; then
    SED_CMD=("sed" "-i" "" "-E")
else
    SED_CMD=("sed" "-i" "-E")
fi

# ====================== 核心修改：使用 # 作为分隔符 ======================
# 正则：匹配行首缩进 model: xxx，# 代替 / 避免斜杠冲突
find "$TARGET_DIR" -type f | while read -r file; do
    echo "正在处理文件：$file"
    "${SED_CMD[@]}" "s#^([[:space:]]*)model:[[:space:]]+.+#\1model: $NEW_MODEL_STR#" "$file"
done

echo -e "\n✅ 全部文件替换完成！"
