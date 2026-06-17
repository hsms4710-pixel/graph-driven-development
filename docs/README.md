# Graph-Driven Development (GDD)

面向 Coding Agents 的图驱动开发工具。

## 快速开始

### 安装

```bash
npm install
npm run build
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 启动 MCP Server

```bash
npm run mcp
```

## 核心概念

### 5 层节点架构

```
L1: Constitution (项目宪法)
    │
    ▼
L2: TechStack (技术栈)
    │
    ▼
L3: Epic/Feature (史诗/功能)
    │
    ▼
L4: Story/Module (故事/模块)
    │
    ▼
L5: Task/File (任务/文件)
```

### MCP 工具

GDD 提供 18 个 MCP 工具供 Agent 调用：

| 类别 | 工具数 | 说明 |
|------|--------|------|
| 基础工具 | 12 | 图谱 CRUD、节点操作 |
| 智能工具 | 6 | Brainstorm、上下文分析 |

详见 [MCP_TOOLS_REFERENCE.md](./MCP_TOOLS_REFERENCE.md)

## 支持的项目类型

| 语言 | 框架 | 置信度 |
|------|------|--------|
| TypeScript | React, Next.js, Vue | 95%+ |
| Python | FastAPI, Django, Flask, Typer | 90%+ |
| JavaScript | Express, React, Vue | 90%+ |
| Go | Gin, Echo, Fiber | 80%+ |

## 使用场景

### 场景 1: 新项目开发

1. 创建新图谱
2. 启动 Brainstorm 会话
3. 回答澄清问题
4. 生成项目结构
5. Agent 根据图谱编写代码

### 场景 2: 现有项目分析

1. 导入现有项目
2. 自动索引代码
3. 查看图谱结构
4. 识别技术债务
5. 规划重构任务

### 场景 3: 团队协作

1. 导出图谱为 JSON
2. 提交到版本控制
3. 团队成员导入
4. 共同维护项目结构

## 配置

### MCP Server 配置

```json
{
  "mcpServers": {
    "gdd": {
      "command": "npx",
      "args": ["gdd-mcp", "--project", "/path/to/project"]
    }
  }
}
```

### Agent 适配器

GDD 支持以下 Agent 平台：

- Claude Code
- Codex CLI
- CodeBuddy
- TRAE

详见 [AGENT_INTEGRATION.md](./AGENT_INTEGRATION.md)

## 常见问题

### Q: 如何处理大型项目？

A: 使用增量索引功能，只索引变更的文件。详见 V1.4 性能优化。

### Q: 支持哪些框架？

A: 详见 [MCP_TOOLS_REFERENCE.md](./MCP_TOOLS_REFERENCE.md) 中的框架支持列表。

### Q: 如何导出图谱？

A: 在 Web UI 中点击"导出"按钮，或使用 MCP 工具 `gdd_export_graph`。

## 路线图

详见 [ROADMAP.md](./ROADMAP.md)

## 许可证

MIT
