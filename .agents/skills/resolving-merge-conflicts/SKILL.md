---
name: resolving-merge-conflicts
description: "当你需要解决进行中的 git merge / rebase 冲突时使用。"
---

1. **看清当前 merge/rebase 的状态。** 看看 git 历史和冲突文件。

2. **找到每处冲突的「第一手来源」。** 深入理解每次改动背后的意图：读 commit message、查 PR、看原始 issue / 工单。

3. **逐个 hunk 解决。** 能保留双方意图就同时保留；实在不兼容时，挑一个符合本次 merge 目标的版本，并记下取舍。**不要**自己造出新行为。一律走「解决」路线，**绝不**用 `--abort` 撤退。

4. 找出项目里跑的 **自动化检查** 并跑一遍 —— 通常是 typecheck、然后测试、再 format。把 merge 弄坏的地方修好。

5. **收尾 merge/rebase。** 全部 stage 并 commit。如果在 rebase，就一路 `continue` 直到所有 commit 都 rebase 完。
