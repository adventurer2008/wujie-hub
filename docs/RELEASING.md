# Wujie Hub 发布流程

首次社区上架已完成，后续版本无需重复提交申请。

0.1.17起通过独立仓库和新ID wujie-hub重新提交社区。旧仓库plugin-manager-cn保留0.1.16，新条目通过后归档旧社区入口，见 docs/ID-MIGRATION.md。发布检查核对新条目路线和独立仓库记录，不会伪造原条目迁移批准。

移动端发布检查读取 docs/validation/platform-acceptance.json：默认要求真机验收。维护者明确要求先发布后测试时，记录该版本的延期验收授权，并如实披露尚未验证；该授权不能跨版本复用。本次0.1.17按当前任务中的明确指示安排发布后统一测试，没有虚构设备结果。

1. 完成代码修改后运行 `npm run version:prepare -- 0.1.15`（替换为下一版本）。此命令同步 package、lockfile、manifest、versions 和 README 的版本号。
2. 检查差异并提交到 main，推送 main。普通 push 和 PR 自动运行元数据检查、类型检查、测试和构建。
3. 给该 main 提交创建同名标签，例如 `git tag 0.1.15`，再执行 `git push origin 0.1.15`。标签必须是纯数字 x.y.z，且与 manifest 完全一致。
4. Release 工作流重新执行全部检查，只允许发布当前远端 main 的提交；生成三个发行文件的 GitHub 来源证明，然后创建带文件的草稿，验证来源证明后转为正式 Release。
5. Obsidian 社区定期检测正式 Release 并自动扫描；通过后目录更新。社区检测和审核有延迟，不保证推送后立即可安装。审核失败要修复并发布新的递增版本；不要覆盖已经公开的标签或发行文件。

GitHub Release 仅上传 Obsidian 支持的 main.js、manifest.json、styles.css。许可证保留在源码仓库，手动安装步骤见 README。无需额外长期令牌；发布使用仓库工作流的短期 GITHUB_TOKEN，来源证明使用 GitHub OIDC。只有标签发布任务有写入 Release 和证明的权限，普通检查只读。

在 GitHub Actions 查看 Checks/Release 的结果。失败时先修复原因；若已经留下未公开的草稿，可在对应工作流重跑，流程仅恢复草稿，不覆盖正式 Release。社区仍未检测新版时，可在其管理页面手动 Check for new releases；该操作有频率限制。
