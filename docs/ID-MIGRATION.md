# Wujie Hub 新条目与旧版处理

维护者选择重新提交独立插件，而不修改原社区条目的ID。

- 新仓库：https://github.com/adventurer2008/wujie-hub ，独立GitHub仓库ID为1437730378；插件ID、包名和目录统一为 wujie-hub。
- 旧仓库：https://github.com/adventurer2008/plugin-manager-cn ，原GitHub仓库ID为1437068143，保留0.1.16旧ID发行文件。旧条目标为Community Manager CN Legacy。
- 旧社区条目暂保留Legacy入口，不自动归档；后续是否归档另行安排。归档也不删除旧GitHub仓库及用户本地文件。新条目下载统计重新开始，旧用户需重新安装。
- 同一维护者继续维护新项目，保留源代码历史、版权和Apache2许可证。

## 同设备、同库的手动替换

1. 在 Obsidian 官方插件设置中停用旧管理器，保留旧目录、配置和备份。
2. 新发行包安装到 `<配置目录>/plugins/wujie-hub/`。不要混用旧包与新目录，不要让新旧管理器同时运行。
3. 如需沿用管理器配置，仅在同一设备、同一库中手动复制旧data.json到新目录；保留原文件，不能覆盖已有新配置。不要跨设备复制本机回退快照。
4. 启用新插件后检查搜索、更新和本机回退目标。新管理器保护新旧两个管理器ID；旧版仍运行时拒绝文件修改。

不会自动移动或删除旧目录，不改动无界同步或其他目标插件的data.json。移动端和最低版本运行时验收按维护者要求发布后统一补充。

规则参考：https://docs.obsidian.md/community-directory/faq 。本次通过独立仓库和新ID重新提交审核，保留旧入口直到新条目可用，不是原条目ID迁移。
