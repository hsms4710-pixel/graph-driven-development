# Graph-Driven Development

> Coding Agent 的图驱动开发插件 + 独立 Web UI

Graph-Driven Development (GDD) 是一个创新的开发工具，让你：

- **通过 Agent 对话开发**：与 Claude Code、Codex CLI、CodeBuddy 等 Agent 对话，AI 自动管理项目图谱
- **独立可视化审查**：完整的 Web UI，可视化查看和编辑项目架构
- **需求智能澄清**：Brainstorm 引擎自动生成澄清问题

## 核心特性

### 1. MCP Server（Agent 插件）

支持 Claude Code、Codex CLI、CodeBuddy、TRAE 等 Agent 平台通过 MCP 协议调用：

```
用户需求 → [Coding Agent + GDD MCP] → 可运行代码
              ↑
         图谱可视化 + 需求澄清 + 依赖管理
```

**12 个基础 MCP 工具**：
- `gdd_create_graph` - 创建图谱项目
- `gdd_load_graph` - 加载图谱或从代码索引生成
- `gdd_add_node` - 添加节点
- `gdd_update_node` - 更新节点
- `gdd_delete_node` - 删除节点
- `gdd_add_edge` - 添加边
- `gdd_delete_edge` - 删除边
- `gdd_get_pending_clarifications` - 获取待澄清问题
- `gdd_submit_clarification_answer` - 提交澄清答案
- `gdd_get_dependency_impact` - 获取依赖影响
- `gdd_export_graph` - 导出图谱（JSON/Markdown/Mermaid）
- `gdd_list_graphs` - 列出所有图谱

**6 个智能 Brainstorm MCP 工具（M3）**：
- `gdd_smart_start_session` - 启动智能 Brainstorm 会话（自动分析代码上下文）
- `gdd_smart_get_next_question` - 获取下一个智能澄清问题
- `gdd_smart_answer_question` - 回答智能问题并更新上下文
- `gdd_smart_get_progress` - 获取智能会话进度
- `gdd_smart_update_context` - 更新项目上下文
- `gdd_smart_get_inferences` - 获取推断历史

### 2. 独立 Web UI

- **5 层架构可视化**：L1 宪法 → L2 技术栈 → L3 Epic → L4 Story → L5 Task
- **React Flow 图谱编辑器**：拖拽节点、连线表示依赖
- **Brainstorm 交互**：需求澄清问题生成和回答
- **项目管理**：创建、编辑、删除、导出项目

### 3. 智能 Brainstorm（M3）

- **上下文感知**：从代码索引结果自动推断技术栈、架构模式
- **动态问题生成**：根据上下文智能调整问题和选项
- **智能选项过滤**：根据已有答案动态调整后续选项
- **推断历史**：记录所有推断过程，便于审查

### 4. 多 Agent 平台适配（M4）

- **统一适配器接口**：所有 Agent 平台使用相同的接口
- **多平台支持**：Claude Code、Codex CLI、CodeBuddy、TRAE
- **灵活传输方式**：stdio（CLI）/ http（HTTP Server）/ inprocess（内置插件）
- **会话管理**：支持多会话并发
- **健康检查**：自动检测适配器状态

### 5. 实时同步

- **WebSocket 实时通信**：图谱变更实时推送到所有客户端
- **Agent ↔ Web UI 同步**：Agent 操作的图谱变更自动显示在 Web UI

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装

```bash
npm install
```

### 启动开发环境

```bash
# 同时启动后端和前端
npm start

# 或分别启动
npm run server  # 后端 (端口 3001)
npm run dev     # 前端 (端口 5173)
```

### 启动 MCP Server（供 Agent 调用）

```bash
npm run mcp
```

## 使用方式

### 方式一：通过 Agent 对话

1. 在 Claude Code 中配置 MCP Server：
```json
{
  "mcpServers": {
    "graph-driven-development": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"]
    }
  }
}
```

2. 与 Agent 对话：
```
用户: 帮我创建一个电商后台管理系统
Agent: [调用 gdd_create_graph]
Agent: [调用 gdd_add_node 添加 L1_Constitution]
Agent: [调用 gdd_get_pending_clarifications]
Agent: 请问这个系统的主要用户群体是什么？
```

### 方式二：通过 Web UI

1. 打开浏览器访问 http://localhost:5173
2. 点击「+ 新建项目」创建项目
3. 在左侧工具栏选择层级添加节点
4. 拖拽创建节点间的连接
5. 点击节点编辑详情

## 5 层架构

| 层级 | 名称 | 说明 | 图标 |
|------|------|------|------|
| L1 | Constitution | 项目宪法/原则 | 📜 |
| L2 | TechStack | 技术栈决策 | 🔧 |
| L3 | Epic | 功能范围 | 📋 |
| L4 | Story | 用户故事 | 📝 |
| L5 | Task | 任务/文件 | ⚡ |

## 边类型

| 类型 | 说明 | 样式 |
|------|------|------|
| depends_on | 依赖关系 | 实线红色 |
| contains | 包含关系 | 虚线绿色 |
| implements | 实现关系 | 实线橙色 |
| refines | 细化关系 | 动画紫色 |

## 技术栈

| 组件 | 技术 |
|------|------|
| 前端框架 | React 18 |
| 图谱渲染 | React Flow |
| 状态管理 | Zustand |
| 后端框架 | Express |
| 数据存储 | SQLite (better-sqlite3) |
| 实时通信 | WebSocket |
| MCP 协议 | @modelcontextprotocol/sdk |

## 开发计划

### M1：MCP Server + 后端优化 ✅
- [x] MCP Server 完整实现（12 个工具）
- [x] SQLite 数据存储
- [x] WebSocket 实时同步

### M2：代码索引 + 实时同步 ✅
- [x] 从代码库生成图谱（TypeScript, JavaScript, Python, Go, Rust）
- [x] 自动识别项目语言和框架
- [x] 模块/文件/函数层级提取
- [x] import 依赖关系分析
- [x] WebSocket 实时推送图谱变更到 Web UI
- [x] 前端代码索引对话框

### M3：Brainstorm 智能化
- [ ] 动态生成澄清问题
- [ ] 问题优先级排序
- [ ] 智能推荐

### M4：多 Agent 平台适配
- [ ] Claude Code 集成
- [ ] Codex CLI 集成
- [ ] CodeBuddy 内置
- [ ] TRAE 集成

### M5：1.0 正式版
- [ ] 性能优化
- [ ] 稳定性提升
- [ ] 文档完善

## 代码索引

### 支持的语言
- TypeScript / JavaScript
- Python
- Go
- Rust

### 索引层级
```
L1: Constitution (项目宪法)
    ↓
L2: TechStack (技术栈)
    ↓
L3: Epic (模块)
    ↓
L4: Story (文件)
    ↓
L5: Task (函数/类)
```

### 使用方式

通过 Web UI 的「代码索引」按钮，或 API：

```bash
curl -X POST http://localhost:3001/api/graphs/from-code \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/path/to/your/project"}'
```

## 部署

### 本地部署

```bash
npm install
npm start
```

### 云端部署

前端已部署到 CloudStudio：https://c39ff7e85ae84a6d98e043da78cd0b83.tc-nanjing.share.codebuddy.woa.com

## GitHub

https://github.com/hsms4710-pixel/graph-driven-development

## 许可证

MIT
