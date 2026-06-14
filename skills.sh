#!/bin/bash
# -----------------------------------------------------------------------------
# Install LearnVis Agent Skills
# 
# 这种方式会直接从当前的 GitHub 仓库安装 `learnvis` 技能，
# 而不是去维护一个单独的 skills 仓库。
# -----------------------------------------------------------------------------

echo "正在从源码仓库安装 learnvis 技能..."
npx skills 0xlxx/learnvis -s learnvis
echo "安装完成！"
