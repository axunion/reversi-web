#!/bin/bash
# PostToolUse hook: format the just-edited file with Biome so the
# ship-next-task loop's code-reviewer step doesn't waste cycles on style noise.
file_path=$(jq -r '.tool_input.file_path' <<<"$(cat)")
[ -n "$file_path" ] && [ "$file_path" != "null" ] && pnpm exec biome check --write --no-errors-on-unmatched "$file_path" >/dev/null 2>&1
exit 0
