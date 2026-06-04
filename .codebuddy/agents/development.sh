#!/bin/bash

# Define two target directories
TARGET_DIRS=(
    "$HOME/.codebuddy/agents"
)

# Get the current script directory (source folder)
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Track if any errors occurred
ERROR_OCCURRED=0

# Iterate over all target directories
for DEST in "${TARGET_DIRS[@]}"; do
    # Create directory if it doesn't exist
    if [ ! -d "$DEST" ]; then
        echo "Creating directory: $DEST"
        mkdir -p "$DEST"
        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to create target directory \"$DEST\""
            ERROR_OCCURRED=1
            continue
        fi
    fi

    echo ""
    echo "Cleaning existing folders in destination..."
    for dir in "$DEST"/*/; do
        [ -d "$dir" ] && rm -rf "$dir"
    done

    echo ""
    echo "Copying folders to: \"$DEST\""
    echo "----------------------------------------------------"

    # Iterate over all folders in source directory
    for SOURCE_FOLDER in "$SOURCE_DIR"/*/; do
        # Check if the glob actually matched anything
        [ -d "$SOURCE_FOLDER" ] || continue
        
        FOLDER_NAME=$(basename "$SOURCE_FOLDER")
        echo "Copying: $FOLDER_NAME"
        cp -r "$SOURCE_FOLDER" "$DEST/$FOLDER_NAME"
        if [ $? -ne 0 ]; then
            echo "WARNING: Failed to copy $FOLDER_NAME"
            ERROR_OCCURRED=1
        else
            echo "Successfully copied: $FOLDER_NAME"
        fi
    done
done

echo ""
echo "----------------------------------------------------"
if [ $ERROR_OCCURRED -eq 0 ]; then
    echo "All folders copied to all directories successfully!"
else
    echo "Some folders failed to copy. Please check the warnings above."
fi
