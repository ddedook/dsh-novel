# Changelog

## 0.1.2 — 2026-10-24

- 支持 DeepSeek Harness 0.2.1-rc.3（cordis 4.0.5）：去掉已停更的 `dsh-client-runtime`，客户端改用 cordis `Context` + slots。
- Host：`JsonValue` 改从 `dsh-util-values`；工具 cwd 读 `agent.session.header.cwd`。
- 客户端：适配 `ConvViewProps` / 图标 Medium 命名，以及 `MarkdownText` 的 `labels`。

## 0.1.1 — 2026-08-18

- 大纲与正文身份只收序号 + 短名，界面显示「第N卷/章 + 名称」；写入时剥掉 name 里已有的「第1章 / 第一章」等前缀，避免标题重复。
- 章节详情标题行左侧为章名，右侧为去空白字数和复制正文。
- 正文开头若再写一遍章名，展示时隐藏；复制仍是完整原文。关联大纲只显示所属卷，不再重复「第N章」。

## 0.1.0 — 2026-08-18

- 首个 npm 发布：DeepSeek Harness 标准小说插件，一个工作区目录一本小说。
- 会话「内容」页可浏览概述、世界、人物、生物、物品、等级、时间线、大纲、章节和技能。
- `/novel-create` 开书设定；`/novel-outline`、`/novel-chapter` 由用户显式写大纲和正文。
