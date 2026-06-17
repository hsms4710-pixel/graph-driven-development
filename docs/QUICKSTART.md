# 快速开始

## 5 分钟快速体验

### 1. 安装

```bash
git clone https://github.com/hsms4710-pixel/graph-driven-development.git
cd graph-driven-development
npm install
```

### 2. 启动 Web UI

```bash
npm run dev
```

打开 http://localhost:5173

### 3. 创建第一个项目

1. 点击"新建图谱"
2. 输入项目名称
3. 启动 Brainstorm 会话
4. 回答几个简单问题
5. 查看生成的项目结构

## 与 Agent 集成

### Claude Code

1. 在 Claude Code 中配置 MCP Server：

```json
{
  "mcpServers": {
    "gdd": {
      "command": "npx",
      "args": ["gdd-mcp", "--project", "/path/to/your/project"]
    }
  }
}
```

2. 重启 Claude Code

3. 开始对话：

```
我正在开发一个 React + TypeScript 的待办事项应用，请帮我规划项目结构
```

Agent 会自动调用 GDD 的 Brainstorm 工具，生成项目结构。

### Codex CLI

```bash
codex config set mcp.gdd.enabled true
codex config set mcp.gdd.command "npx"
codex config set mcp.gdd.args '["gdd-mcp"]'
```

## 代码索引

### 索引现有项目

1. 在 Web UI 中点击"导入项目"
2. 选择项目目录
3. 等待索引完成
4. 查看图谱

### 索引结果

```
项目: my-react-app
语言: TypeScript
框架: React
文件: 45 个
节点: 128 个
边: 142 条
```

## 模板系统

### 使用模板创建项目

1. 在 Web UI 中点击"使用模板"
2. 选择模板（React、FastAPI、CLI 等）
3. 填写项目信息
4. 生成项目

### 可用模板

| 模板 | 语言 | 框架 | 复杂度 |
|------|------|------|--------|
| React + TypeScript | TypeScript | React | 初级 |
| Next.js + TypeScript | TypeScript | Next.js | 中级 |
| FastAPI + Python | Python | FastAPI | 初级 |
| CLI + Typer | Python | Typer | 初级 |

## 常见工作流

### 新项目

```
1. 新建图谱
   ↓
2. Brainstorm 会话
   ↓
3. 生成项目结构
   ↓
4. Agent 编写代码
   ↓
5. 实时同步到图谱
```

### 现有项目重构

```
1. 导入项目
   ↓
2. 分析图谱
   ↓
3. 识别问题
   ↓
4. 规划重构
   ↓
5. Agent 执行重构
```

### 团队协作

```
1. 导出图谱 (JSON)
   ↓
2. 提交到 Git
   ↓
3. 团队成员导入
   ↓
4. 共同维护
```

## 下一步

- 阅读 [MCP_TOOLS_REFERENCE.md](./MCP_TOOLS_REFERENCE.md) 了解所有 MCP 工具
- 阅读 [AGENT_INTEGRATION.md](./AGENT_INTEGRATION.md) 了解 Agent 集成细节
- 查看 [ROADMAP.md](./ROADMAP.md) 了解未来计划
