# GDD vs CodeGraph 功能对比与增强

## 📊 研究背景

GDD 的灵感来源是 **CodeGraph**（由 Colby McHenry 创建，42.8k Stars），一个为 AI 编码代理设计的预索引代码知识图谱工具。

---

## 一、CodeGraph 核心能力

### 1.1 性能指标

| 指标 | 效果 |
|------|------|
| 工具调用减少 | 92% |
| 速度提升 | 71% |
| 成本降低 | 35% |

### 1.2 MCP 工具列表

| 工具名 | 功能 |
|--------|------|
| `codegraph_explore` | **主要工具** - 单次调用返回入口点、相关符号和代码片段 |
| `codegraph_search` | 按名称搜索符号 |
| `codegraph_callers` | 查找函数的所有调用点 |
| `codegraph_callees` | 函数调用了哪些其他函数 |
| `codegraph_impact` | 分析修改符号的影响范围 |
| `codegraph_routes` | 识别框架路由定义 |

### 1.3 核心技术

- **tree-sitter** AST 解析
- **SQLite + FTS5** 全文搜索
- **原生 OS 文件监视** (FSEvents/inotify)
- **22 种语言支持** + 17 种框架路由识别

---

## 二、GDD 原有能力

| 功能 | 工具 | 状态 |
|------|------|------|
| Brainstorm 会话 | `gdd_smart_start_session` | ✅ |
| 创建图谱 | `gdd_create_graph` | ✅ |
| 添加节点 | `gdd_add_node` | ✅ |
| 添加边 | `gdd_add_edge` | ✅ |
| 获取图谱 | `gdd_get_graph` | ✅ |
| 列出图谱 | `gdd_list_graphs` | ✅ |

---

## 三、GDD 缺失的能力（从 CodeGraph 和 SDD 学习）

### 3.1 代码索引能力（从 CodeGraph 学习）

| 缺失功能 | 重要性 | GDD 现状 |
|---------|--------|---------|
| 代码库索引 | 🔴 高 | ❌ 未实现 |
| 符号搜索 | 🔴 高 | ❌ 未实现 |
| 调用链分析 | 🔴 高 | ❌ 未实现 |
| 影响分析 | 🔴 高 | ❌ 未实现 |
| 框架路由识别 | 🟡 中 | ❌ 未实现 |
| 自动同步 | 🟡 中 | ❌ 未实现 |

### 3.2 L5_Task 节点代码指导信息（从 SDD 学习）

| 缺失字段 | 说明 |
|---------|------|
| `description` | 详细描述 |
| `interface` | 接口定义 (TypeScript) |
| `dependencies` | 依赖的其他模块 |
| `template` | 代码模板 |
| `constraints` | 约束条件 |
| `examples` | 使用示例 |
| `implementation` | 实现要求 |

---

## 四、GDD 增强版（v0.2.0）

### 4.1 新增 MCP 工具

| 工具名 | 功能 | 参数 |
|--------|------|------|
| `gdd_codegraph_index` | 索引代码库，建立符号关系图 | `project_path` |
| `gdd_codegraph_explore` | 探索代码库，返回相关符号和调用关系 | `query`, `project_path` |
| `gdd_codegraph_search` | 搜索代码符号 | `query`, `project_path`, `kind?` |
| `gdd_codegraph_callers` | 查找函数的所有调用点 | `symbol_name`, `project_path` |
| `gdd_codegraph_callees` | 查找函数调用了哪些其他函数 | `symbol_name`, `project_path` |
| `gdd_codegraph_impact` | 分析修改符号的影响范围 | `symbol_name`, `project_path` |
| `gdd_codegraph_routes` | 识别框架路由定义 | `project_path` |

### 4.2 L5_Task 节点增强

```typescript
interface TaskNode {
  id: string;
  layer: 'L5_Task';
  label: string;
  properties: {
    file: string;
    
    // 【新增】代码指导信息
    description?: string;      // 详细描述
    interface?: string;        // 接口定义 (TypeScript)
    dependencies?: string[];   // 依赖的其他模块
    template?: string;         // 代码模板
    constraints?: string[];    // 约束条件
    examples?: string[];       // 使用示例
    implementation?: string;   // 实现要求
  };
}
```

### 4.3 使用示例

```typescript
// 1. 索引代码库
await gdd_codegraph_index({ project_path: '/path/to/project' });

// 2. 探索代码
const result = await gdd_codegraph_explore({
  query: 'GameEngine',
  project_path: '/path/to/project',
});

// 3. 查找调用者
const callers = await gdd_codegraph_callers({
  symbol_name: 'update',
  project_path: '/path/to/project',
});

// 4. 影响分析
const impact = await gdd_codegraph_impact({
  symbol_name: 'render',
  project_path: '/path/to/project',
});

// 5. 添加带代码指导的 L5_Task 节点
await gdd_add_node({
  graph_id: 'my-game',
  layer: 'L5_Task',
  label: '实现 GameEngine',
  properties: {
    file: 'src/core/GameEngine.ts',
    description: '游戏主循环引擎，负责更新游戏状态和渲染画面',
    interface: `class GameEngine {
  update(dt: number): void;
  render(): void;
  start(): void;
  stop(): void;
}`,
    dependencies: ['Renderer', 'InputManager', 'SceneManager'],
    constraints: ['60 FPS 目标', '内存占用 < 500MB'],
    examples: [
      'engine.update(16.67); // 60 FPS',
      'engine.render(); // 渲染当前场景',
    ],
    implementation: '使用 requestAnimationFrame 实现游戏循环，支持暂停和恢复',
  },
});
```

---

## 五、GDD 完整工具列表（v0.2.0）

### 5.1 原有工具（8 个）

| 工具名 | 功能 |
|--------|------|
| `gdd_create_graph` | 创建项目图谱 |
| `gdd_add_node` | 添加节点（支持代码指导信息） |
| `gdd_add_edge` | 添加边 |
| `gdd_smart_start_session` | 启动 Brainstorm 会话 |
| `gdd_smart_get_next_question` | 获取下一个澄清问题 |
| `gdd_smart_answer_question` | 回答澄清问题 |
| `gdd_get_graph` | 获取图谱完整数据 |
| `gdd_list_graphs` | 列出所有图谱 |

### 5.2 新增工具（7 个）

| 工具名 | 功能 |
|--------|------|
| `gdd_codegraph_index` | 索引代码库 |
| `gdd_codegraph_explore` | 探索代码库 |
| `gdd_codegraph_search` | 搜索符号 |
| `gdd_codegraph_callers` | 查找调用者 |
| `gdd_codegraph_callees` | 查找被调用者 |
| `gdd_codegraph_impact` | 影响分析 |
| `gdd_codegraph_routes` | 路由识别 |

**总计：15 个 MCP 工具**

---

## 六、启动方式

```bash
# 启动增强版 GDD 服务器
cd /Users/jiangqiyuan/Desktop/graph-driven-development
NODE_PATH=node_modules npx tsx src/mcp/server-enhanced.ts

# 访问端点
# 健康检查: http://localhost:3100/health
# 工具列表: http://localhost:3100/tools
# MCP 端点: http://localhost:3100/mcp
```

---

## 七、与 SDD 的对比

| 功能 | SDD | GDD (增强后) |
|------|-----|-------------|
| 需求澄清 | ✅ | ✅ |
| 结构生成 | ✅ Spec 文档 | ✅ 图谱 |
| **代码指导** | ✅ Spec 包含实现要求 | ✅ L5_Task 支持代码指导 |
| 代码生成 | ❌ | ❌ |
| MCP 工具 | ❌ | ✅ 15 个工具 |
| 代码索引 | ✅ | ✅ |

---

## 八、下一步计划

1. **完善代码索引** - 使用 tree-sitter 替代简单正则
2. **添加自动同步** - 监听文件变化自动更新索引
3. **扩展框架识别** - 支持更多框架的路由识别
4. **添加图谱可视化** - 从图谱数据生成可视化
5. **代码生成指导** - 基于 L5_Task 的代码指导信息生成代码
