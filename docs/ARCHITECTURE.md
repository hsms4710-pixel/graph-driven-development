# Graph-Driven Development 架构设计

## 概述

Graph-Driven Development (GDD) 是一个面向 Coding Agents 的图驱动开发插件，通过 MCP 协议与 AI Agent 通信，提供代码索引、智能 Brainstorm 和项目可视化功能。

---

## 核心架构

### 5 层节点架构

```
L1: Constitution (项目宪法)
    │
    └── L2: TechStack (技术栈)
            │
            └── L3: Epic/Feature (史诗/功能)
                    │
                    └── L4: Story/Module (故事/模块)
                            │
                            └── L5: Task/File (任务/文件)
```

#### L1: Constitution
- 定义项目的整体愿景和原则
- 包含架构决策记录 (ADR)
- 约束条件和设计原则

#### L2: TechStack
- 语言、框架、库选择
- 构建工具、部署配置
- 依赖版本管理

#### L3: Epic/Feature
- 大型功能模块
- 用户故事分组
- 里程碑定义

#### L4: Story/Module
- 具体的用户故事
- 功能模块划分
- 验收标准

#### L5: Task/File
- 具体任务
- 代码文件映射
- 实现细节

---

## 模块架构

```
┌─────────────────────────────────────────────────────────────┐
│                         用户界面                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ React   │  │ React   │  │ Zustand │  │ Custom  │         │
│  │ Flow    │  │ Flow    │  │ Store   │  │ Hooks   │         │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘         │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                        核心引擎层                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ GraphStore  │  │ CodeIndexer │  │ Brainstorm  │          │
│  │ (状态管理)   │  │ (代码分析)   │  │ Engine      │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                        服务层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ MCP Server  │  │ WebSocket   │  │ SQLite      │          │
│  │ (18 工具)    │  │ Server      │  │ Storage     │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                        适配器层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Claude Code │  │ CodeBuddy   │  │ Codex CLI   │          │
│  │ Adapter     │  │ Adapter     │  │ Adapter     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## 数据流

### Agent ↔ GDD 通信

```
┌─────────────┐                              ┌─────────────┐
│   Coding    │                              │   GDD       │
│   Agent     │                              │   Server    │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │  1. 调用 MCP 工具                          │
       │  ────────────────────────────────────────► │
       │                                            │
       │                    2. 执行操作             │
       │                    (索引/分析/生成)        │
       │                                            │
       │  3. 返回结果                               │
       │  ◄───────────────────────────────────────  │
       │                                            │
       │  4. WebSocket 事件                         │
       │  ◄───────────────────────────────────────  │
       │                                            │
```

### 代码索引流程

```
1. 扫描项目目录
       │
       ▼
2. 文件过滤 (排除 node_modules, .git 等)
       │
       ▼
3. 语言检测
       │
       ▼
4. AST 解析
       │
       ├─────────────────────────────────────┐
       ▼                                     ▼
5. 提取符号                        6. 分析依赖
       │                                     │
       └─────────────────────────────────────┘
                        │
                        ▼
7. 生成节点和边
       │
       ▼
8. 存储到 SQLite
       │
       ▼
9. 触发 WebSocket 事件
```

---

## 关键模块

### 1. MCP Server

**位置**: `src/mcp/`

**职责**:
- 提供 18 个 MCP 工具
- 处理 Agent 请求
- 管理会话状态

**核心类**:
- `MCPServer`: 服务器主体
- `MCPToolRegistry`: 工具注册表
- `MCPContext`: 会话上下文

### 2. CodeIndexer

**位置**: `src/indexer/`

**职责**:
- 扫描和解析代码文件
- 提取符号和依赖
- 生成图节点

**核心类**:
- `CodeIndexer`: 主索引器
- `PythonEnhancer`: Python 增强分析
- `FrameworkAnalyzer`: 框架检测
- `IncrementalIndexer`: 增量索引

### 3. Brainstorm Engine

**位置**: `src/brainstorm/`

**职责**:
- 需求分析
- 问题生成
- 会话管理

**核心类**:
- `BrainstormEngine`: 基础引擎
- `SmartBrainstormEngine`: 智能引擎
- `ContextAnalyzer`: 上下文分析
- `SmartQuestionGenerator`: 问题生成

### 4. Agent Adapters

**位置**: `src/agent-adapter/`

**职责**:
- 适配不同 Agent 平台
- 统一通信接口
- 会话管理

**核心接口**:
```typescript
interface IAgentAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  callTool(name: string, args: unknown): Promise<unknown>;
  onEvent(callback: (event: AgentEvent) => void): void;
}
```

### 5. Platform Extensions

**位置**: `src/ci-cd/`, `src/cloud/`, `src/database/`, `src/monitoring/`

**职责**:
- 生成 CI/CD 配置
- 生成云服务配置
- 生成数据库 Schema
- 生成监控配置

---

## 存储设计

### SQLite Schema

```sql
-- 节点表
CREATE TABLE nodes (
    id TEXT PRIMARY KEY,
    graph_id TEXT NOT NULL,
    layer TEXT NOT NULL,
    label TEXT NOT NULL,
    file_path TEXT,
    start_line INTEGER,
    end_line INTEGER,
    properties TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

-- 边表
CREATE TABLE edges (
    id TEXT PRIMARY KEY,
    graph_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    type TEXT NOT NULL,
    label TEXT,
    properties TEXT,
    created_at INTEGER
);

-- 会话表
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    graph_id TEXT NOT NULL,
    status TEXT NOT NULL,
    current_question TEXT,
    answers TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

-- 索引缓存表
CREATE TABLE index_cache (
    graph_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    hash TEXT NOT NULL,
    content TEXT,
    updated_at INTEGER,
    PRIMARY KEY (graph_id, file_path)
);
```

---

## 扩展点

### 添加新语言支持

1. 在 `src/indexer/` 创建语言解析器
2. 实现 `LanguageParser` 接口
3. 注册到 `CodeIndexer`

```typescript
interface LanguageParser {
  language: string;
  extensions: string[];
  parse(content: string): ParseResult;
}
```

### 添加新 Agent 适配器

1. 在 `src/agent-adapter/adapters/` 创建适配器
2. 实现 `IAgentAdapter` 接口
3. 注册到 `AgentAdapterManager`

### 添加新平台集成

1. 在对应目录 (`src/ci-cd/`, `src/cloud/` 等) 创建生成器
2. 实现对应的生成方法
3. 导出到模块入口

---

## 性能优化策略

### 增量索引
- 文件哈希检测
- 仅索引变更文件
- 缓存持久化

### LRU 缓存
- 容量限制
- TTL 过期
- 内存估算

### 并发处理
- 批量文件扫描
- Worker 线程支持
- 进度反馈

---

## 安全考虑

1. **输入验证**: 所有外部输入都经过验证
2. **SQL 参数化**: 使用参数化查询防止注入
3. **路径规范化**: 防止路径遍历攻击
4. **错误处理**: 不暴露内部细节

---

*最后更新: 2026-06-17*
