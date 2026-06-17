# Graph-Driven Development (GDD)

面向 Coding Agents 的图驱动开发工具。

[![Version](https://img.shields.io/badge/version-2.0.0-blue)]()
[![Tests](https://img.shields.io/badge/tests-56%2F56-green)]()
[![License](https://img.shields.io/badge/license-MIT-orange)]()

## 📖 文档

- [快速开始](./QUICKSTART.md) - 5 分钟上手
- [API 参考](./API_REFERENCE.md) - MCP 工具和 API 详细说明
- [架构设计](./ARCHITECTURE.md) - 系统架构和扩展指南
- [MCP 工具参考](./MCP_TOOLS_REFERENCE.md) - 18 个 MCP 工具详解
- [Agent 集成](./AGENT_INTEGRATION.md) - 如何与 Agent 集成
- [开发路线图](./ROADMAP.md) - 项目规划和进度

## 🎯 核心特性

- 🎯 **5 层节点架构**: L1 Constitution → L2 TechStack → L3 Epic → L4 Story → L5 Task
- 🔧 **MCP Server**: 18 个工具供 Agent 调用（12 基础 + 6 智能）
- 🧠 **智能 Brainstorm**: 上下文感知的问题生成，10+ Python 框架检测
- 📊 **代码索引**: 支持 TypeScript、JavaScript、Python、Go、Java
- 🌐 **多平台支持**: Claude Code、Codex CLI、CodeBuddy、TRAE
- ☁️ **平台集成**: CI/CD、云服务、数据库、监控配置生成

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建
npm run build

# 启动 MCP Server
npm run mcp

# 运行测试
npx ts-node test/v2.0-test.ts
```

访问 http://localhost:5173

## 📊 项目状态

| 指标 | 数值 |
|------|------|
| 代码行数 | 18,000+ |
| 测试通过 | 56/56 (100%) |
| 模块数量 | 16 |
| 编译错误 | 0 |

## 📐 核心概念

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

详见 [API_REFERENCE.md](./API_REFERENCE.md)

### 平台集成

| 模块 | 支持平台 |
|------|----------|
| CI/CD | GitHub Actions, GitLab CI, Jenkins |
| 云服务 | AWS, Azure, GCP, 腾讯云, 阿里云 |
| 数据库 | Prisma, Drizzle, SQL, TypeORM |
| 监控 | Prometheus, Grafana, OpenTelemetry |

## 📁 支持的项目类型

| 语言 | 框架 | 置信度 |
|------|------|--------|
| TypeScript | React, Next.js, Vue | 95%+ |
| Python | FastAPI, Django, Flask, Typer | 90%+ |
| JavaScript | Express, React, Vue | 90%+ |
| Go | Gin, Echo, Fiber | 80%+ |

## 💡 使用场景

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

### 场景 3: CI/CD 配置生成

1. 分析项目结构
2. 选择目标平台
3. 生成 CI/CD 配置
4. 生成云服务配置
5. 生成监控配置

## 🔧 配置

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

## 🌐 在线体验

[部署预览](https://c39ff7e85ae84a6d98e043da78cd0b83.tc-nanjing.share.codebuddy.woa.com)

## 📝 License

MIT
