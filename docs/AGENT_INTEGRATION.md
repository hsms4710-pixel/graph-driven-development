# Agent 集成指南

本文档介绍如何将 Graph-Driven Development (GDD) 集成到不同的 Agent 平台。

## 支持的 Agent 平台

| 平台 | 传输方式 | 状态 | 说明 |
|------|---------|------|------|
| Claude Code | stdio | ✅ 支持 | 通过 MCP 协议集成 |
| Codex CLI | stdio | ✅ 支持 | 通过 MCP 协议集成 |
| CodeBuddy | inprocess / stdio | ✅ 支持 | 内置集成 + MCP 协议 |
| TRAE | http | ✅ 支持 | HTTP/SSE 传输 |
| Cursor | stdio | 🔜 计划中 | 通过 MCP 协议集成 |
| Windsurf | http | 🔜 计划中 | HTTP 传输 |

## 快速开始

### Claude Code 集成

#### 1. 配置 MCP Server

在 Claude Code 的 MCP 配置文件中添加 GDD：

```json
{
  "mcpServers": {
    "graph-driven-development": {
      "command": "npx",
      "args": ["gdd-mcp-server"],
      "env": {
        "GDD_DATA_DIR": "./data"
      }
    }
  }
}
```

#### 2. 重启 Claude Code

重启 Claude Code 以加载新的 MCP Server。

#### 3. 开始使用

在 Claude Code 中直接对话：

```
用户: 帮我创建一个图驱动开发项目，名称是 "my-web-app"

Claude: 我来帮你创建项目。首先让我调用 GDD 工具...
[调用 gdd_create_graph]
项目已创建成功！现在让我加载你的代码库...
[调用 gdd_load_graph]
```

### Codex CLI 集成

#### 1. 安装 GDD MCP Server

```bash
npm install -g @gdd/mcp-server
```

#### 2. 配置 Codex

在 Codex 配置文件中添加：

```json
{
  "mcpServers": {
    "gdd": {
      "command": "gdd-mcp-server",
      "args": [],
      "transport": "stdio"
    }
  }
}
```

### CodeBuddy 集成

CodeBuddy 支持两种集成方式：

#### 方式一：内置插件模式

GDD 作为 CodeBuddy 的内置插件运行，无需额外配置。

#### 方式二：MCP Server 模式

```json
{
  "mcpServers": {
    "gdd": {
      "command": "npx",
      "args": ["gdd-mcp-server"],
      "transport": "stdio"
    }
  }
}
```

### TRAE 集成

#### 1. 启动 GDD HTTP Server

```bash
npm run server
```

#### 2. 配置 TRAE

在 TRAE 配置中添加 GDD 服务器：

```json
{
  "gdd": {
    "url": "http://localhost:3001",
    "token": "your-api-token"
  }
}
```

## MCP 工具列表

GDD 提供以下 MCP 工具供 Agent 调用：

### 图谱管理

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `gdd_create_graph` | 创建新的图驱动开发项目 | `name`, `description?` |
| `gdd_load_graph` | 加载已有图谱或从代码库索引生成 | `path`, `auto_index?` |
| `gdd_list_graphs` | 列出所有图谱项目 | - |
| `gdd_export_graph` | 导出图谱 | `graph_id`, `format?` |

### 节点操作

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `gdd_add_node` | 在图谱中添加新节点 | `graph_id`, `layer`, `label`, `properties?` |
| `gdd_update_node` | 更新图谱中的节点 | `graph_id`, `node_id`, `label?`, `properties?` |
| `gdd_delete_node` | 删除节点及其相关边 | `graph_id`, `node_id` |

### 边操作

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `gdd_add_edge` | 在两个节点间创建连接 | `graph_id`, `source`, `target`, `type` |
| `gdd_delete_edge` | 删除图谱中的边 | `graph_id`, `edge_id` |

### Brainstorm

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `gdd_get_pending_clarifications` | 获取待澄清问题 | `graph_id` |
| `gdd_submit_clarification_answer` | 提交澄清答案 | `graph_id`, `session_id`, `question_id`, `answer` |
| `gdd_get_dependency_impact` | 获取依赖影响 | `graph_id`, `node_id` |

### 智能 Brainstorm (M3+)

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `gdd_smart_start_session` | 启动智能会话 | `user_input`, `graph_id?`, `code_paths?` |
| `gdd_smart_get_next_question` | 获取智能问题 | `session_id` |
| `gdd_smart_answer_question` | 回答智能问题 | `session_id`, `question_id`, `answer` |
| `gdd_smart_get_progress` | 获取会话进度 | `session_id` |

## 使用示例

### 示例 1: 从零开始创建项目

```
用户: 我想创建一个电商平台的后端服务

Agent: 好的，让我帮你创建这个项目。首先创建图谱项目...

[调用 gdd_create_graph]
{
  "name": "ecommerce-backend",
  "description": "电商平台后端服务"
}

项目已创建。现在让我通过 Brainstorm 来了解你的需求...

[调用 gdd_smart_start_session]
{
  "user_input": "电商平台后端服务",
  "auto_index": false
}

让我问几个问题来更好地理解你的需求：

**问题 1: 技术栈选择**
请选择主要的后端技术栈：
- Node.js + Express
- Python + FastAPI
- Go + Gin
- Java + Spring Boot
```

### 示例 2: 从现有代码库加载

```
用户: 帮我分析 /path/to/my-project 并生成图谱

Agent: 好的，让我索引你的代码库并生成图谱...

[调用 gdd_load_graph]
{
  "path": "/path/to/my-project",
  "auto_index": true
}

代码索引完成！我已经分析了你的项目：

**检测到的技术栈：**
- 语言: TypeScript
- 框架: React + Node.js
- 状态管理: Zustand
- 测试框架: Vitest

**生成的图谱结构：**
- L1 Constitution: 1 个节点
- L2 TechStack: 5 个节点
- L3 Epic: 3 个节点
- L4 Story: 12 个节点
- L5 Task: 45 个节点

**需要澄清的问题：**

[调用 gdd_get_pending_clarifications]
{
  "graph_id": "xxx"
}

...
```

### 示例 3: 依赖影响分析

```
用户: 如果我修改了用户认证模块，会影响哪些功能？

Agent: 让我分析一下依赖影响...

[调用 gdd_get_dependency_impact]
{
  "graph_id": "xxx",
  "node_id": "auth-module-id"
}

**影响分析结果：**

直接依赖（1级）：
- 登录页面 (L4_Story)
- 注册页面 (L4_Story)
- Token 刷新任务 (L5_Task)

间接依赖（2级）：
- 用户资料编辑 (L4_Story)
- 订单管理 (L4_Story)
- 支付功能 (L4_Story)

建议：修改前请确保以上功能的回归测试。
```

## 故障排除

### 问题：MCP Server 无法启动

**解决方案：**

1. 检查 Node.js 版本（需要 18+）
2. 确保依赖已安装：`npm install`
3. 检查端口是否被占用

### 问题：Agent 无法发现工具

**解决方案：**

1. 确认 MCP Server 已正确配置
2. 重启 Agent
3. 检查 MCP Server 日志

### 问题：连接超时

**解决方案：**

1. 检查网络连接
2. 增加超时时间配置
3. 检查防火墙设置

## API 参考

详细的 API 文档请参考 [API_REFERENCE.md](./API_REFERENCE.md)。

## 贡献

欢迎贡献新的 Agent 平台适配器！

请参考 [CONTRIBUTING.md](../CONTRIBUTING.md) 了解如何贡献代码。
