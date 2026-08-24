# Codex 版 ai-native-cowork

[English](./README-CODEX.md) · [한국어](./README-CODEX.ko.md) · [日本語](./README-CODEX.ja.md) · [简体中文](./README-CODEX.zh-CN.md)

> 让 Codex 从快速编码助手升级为可持续交付伙伴。

Codex 可以迅速实现功能。真正困难的是后续工作：保持计划一致、验证结果、保存决策原因，并让下一个会话无需猜测即可继续。

**ai-native-cowork 是为此设计的工作操作系统。** 它提供六项技能，覆盖 sprint 交付、单功能 PDCA、会话恢复、AI 协作提交和文档同步。同一产品也运行于 Claude Code，并在两个宿主上使用相同的方法和 Done 标准。

## 六项技能

| 技能 | 用途 |
|---|---|
| `cowork-sprint` | 按顺序、并行或混合 sprint 规划并执行多功能 roadmap |
| `pdca-wf` | 通过 Research→Plan→Design→Do→Check/Act→Report 完成单个功能 |
| `cowork-insights` | 将历史 Codex 或 Claude Code 会话整理为工作报告 |
| `cowork-commit` | 将 AI 协作中的关键决策与代码一起提交 |
| `cowork-doc-init` | 初始化现有项目的文档结构 |
| `cowork-doc-sync` | 在实现完成后使文档与真实代码保持一致 |

## 为什么适合 Codex

- 两个宿主共享相同的 lifecycle、gate、artifact 和 Done 规则。
- 使用 Codex 原生 worker、plan、tool 和 approval 边界。
- 通过 schema 验证 sprint 状态，只允许安全的状态转换。
- 根据依赖关系和 file ownership 决定安全的并行执行。
- Goal 控制 envelope 保留在 raw audit 中，但不会进入用户指令、报告或 commit log。
- Claude Code 与 Codex 加载同一套六项 canonical skill。

## 从 ww-w-ai Marketplace 安装

```bash
codex plugin marketplace add ww-w-ai/marketplace
codex plugin add ai-native-cowork@ww-w-ai
```

安装后请启动新的 Codex 会话。

## 更新

```bash
codex plugin marketplace upgrade ww-w-ai
codex plugin add ai-native-cowork@ww-w-ai
```

更新后同样需要启动新会话。

## 验证

```bash
codex plugin list
```

确认 `ai-native-cowork@ww-w-ai` 的状态为 `installed, enabled`。

## 使用示例

```text
使用 cowork-sprint 规划并执行这个 roadmap。
通过 PDCA 构建这个功能。
总结最近七天的 Codex 工作。
附带 AI 协作记录并提交。
实现完成后同步文档。
```

## Codex 特有行为

### Goal 与继续工作

普通功能开发不会隐式创建 Goal。继续已有 Goal 时，系统使用 thread ID 恢复准确的会话，而不是猜测最新 transcript。

### 并行工作

`cowork-sprint` 根据依赖关系和 owned path 计算 deterministic cluster。只有第一个未完成 cluster 可以运行，并行 sprint 的 ownership 不得重叠。

### 审批边界

插件安装、push、release、migration 或外部系统变更等外部或不可逆操作始终需要明确批准。

### 会话隐私

报告引擎读取本地 transcript，仅规范化生成报告或提交记录所需的消息。`cowork-commit` 在写入 git 前严格过滤相关性和 secret。

## 环境要求

- 支持插件的 Codex
- Git
- 用于 TypeScript 报告引擎的 Bun
- 用于 state、scheduler 和 parity 检查的 Python 3

## 本地开发

普通用户应通过公开 Marketplace 安装。开发插件时，请配置指向本地 `plugins/ai-native-cowork` checkout 的 Codex Marketplace，更新 manifest version 或 cachebuster 后使用 `codex plugin add` 重新安装。

Canonical source: [ww-w-ai/ai-native-cowork](https://github.com/ww-w-ai/ai-native-cowork)

Claude Code 用户请参阅 [README.md](./README.md)。

## 许可证

MIT
