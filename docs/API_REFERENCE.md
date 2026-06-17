# Graph-Driven Development API 参考

## MCP 工具 (18 个)

### 基础工具 (12 个)

#### 1. `gdd_init`

初始化 Graph 项目。

**参数**:
```typescript
{
  name: string;        // 项目名称
  path?: string;       // 项目路径
  template?: string;   // 模板名称
}
```

**返回**:
```typescript
{
  graphId: string;
  nodes: Node[];
  edges: Edge[];
}
```

---

#### 2. `gdd_create_node`

创建节点。

**参数**:
```typescript
{
  graphId: string;
  layer: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  label: string;
  properties?: Record<string, unknown>;
}
```

**返回**:
```typescript
{
  nodeId: string;
  node: Node;
}
```

---

#### 3. `gdd_update_node`

更新节点。

**参数**:
```typescript
{
  graphId: string;
  nodeId: string;
  properties: Record<string, unknown>;
}
```

---

#### 4. `gdd_delete_node`

删除节点。

**参数**:
```typescript
{
  graphId: string;
  nodeId: string;
}
```

---

#### 5. `gdd_create_edge`

创建边（关系）。

**参数**:
```typescript
{
  graphId: string;
  sourceId: string;
  targetId: string;
  type: 'depends_on' | 'contains' | 'implements' | 'imports' | 'refines';
  label?: string;
}
```

---

#### 6. `gdd_delete_edge`

删除边。

**参数**:
```typescript
{
  graphId: string;
  edgeId: string;
}
```

---

#### 7. `gdd_index_code`

索引代码库。

**参数**:
```typescript
{
  graphId: string;
  projectPath: string;
  options?: {
    languages?: string[];
    includeTests?: boolean;
    incremental?: boolean;
  };
}
```

**返回**:
```typescript
{
  nodes: Node[];
  edges: Edge[];
  summary: {
    filesScanned: number;
    nodesGenerated: number;
    edgesGenerated: number;
  };
}
```

---

#### 8. `gdd_get_context`

获取项目上下文。

**参数**:
```typescript
{
  graphId: string;
  nodeId?: string;
}
```

**返回**:
```typescript
{
  language: string;
  frameworks: string[];
  architecturePatterns: ArchitecturePattern[];
  dependencies: Dependency[];
  codeMetrics: CodeMetrics;
}
```

---

#### 9. `gdd_search`

搜索节点。

**参数**:
```typescript
{
  graphId: string;
  query: string;
  filters?: {
    layer?: string;
    type?: string;
    tags?: string[];
  };
}
```

**返回**:
```typescript
{
  nodes: Node[];
  edges: Edge[];
}
```

---

#### 10. `gdd_get_path`

获取两个节点之间的路径。

**参数**:
```typescript
{
  graphId: string;
  fromId: string;
  toId: string;
  maxDepth?: number;
}
```

**返回**:
```typescript
{
  paths: Path[];
}
```

---

#### 11. `gdd_export`

导出 Graph。

**参数**:
```typescript
{
  graphId: string;
  format: 'json' | 'markdown' | 'yaml';
}
```

**返回**:
```typescript
{
  content: string;
}
```

---

#### 12. `gdd_import`

导入 Graph。

**参数**:
```typescript
{
  graphId: string;
  content: string;
  format: 'json' | 'markdown' | 'yaml';
}
```

---

### 智能工具 (6 个)

#### 13. `gdd_brainstorm_start`

启动 Brainstorm 会话。

**参数**:
```typescript
{
  graphId: string;
  requirement: string;
  options?: {
    language?: string;
    framework?: string;
    complexity?: 'simple' | 'moderate' | 'complex';
  };
}
```

**返回**:
```typescript
{
  sessionId: string;
  initialQuestions: ClarificationQuestion[];
}
```

---

#### 14. `gdd_brainstorm_answer`

回答 Brainstorm 问题。

**参数**:
```typescript
{
  sessionId: string;
  questionId: string;
  answer: string;
}
```

**返回**:
```typescript
{
  nextQuestions: ClarificationQuestion[];
  completed: boolean;
  generatedNodes?: Node[];
}
```

---

#### 15. `gdd_brainstorm_skip`

跳过问题。

**参数**:
```typescript
{
  sessionId: string;
  questionId: string;
}
```

---

#### 16. `gdd_brainstorm_reset`

重置会话。

**参数**:
```typescript
{
  sessionId: string;
}
```

---

#### 17. `gdd_analyze_requirements`

分析需求。

**参数**:
```typescript
{
  graphId: string;
  text: string;
}
```

**返回**:
```typescript
{
  features: string[];
  constraints: string[];
  assumptions: string[];
  gaps: string[];
}
```

---

#### 18. `gdd_generate_template`

生成模板代码。

**参数**:
```typescript
{
  graphId: string;
  templateName: string;
  variables: Record<string, string>;
}
```

**返回**:
```typescript
{
  files: {
    path: string;
    content: string;
  }[];
}
```

---

## WebSocket 事件

### 连接

```
ws://localhost:3000/ws
```

### 事件类型

#### `graph:update`

Graph 更新事件。

```typescript
{
  type: 'graph:update';
  graphId: string;
  changes: {
    nodes: { added: Node[]; updated: Node[]; deleted: string[] };
    edges: { added: Edge[]; updated: Edge[]; deleted: string[] };
  };
}
```

#### `brainstorm:question`

Brainstorm 问题事件。

```typescript
{
  type: 'brainstorm:question';
  sessionId: string;
  question: ClarificationQuestion;
}
```

#### `index:progress`

索引进度事件。

```typescript
{
  type: 'index:progress';
  graphId: string;
  progress: number;  // 0-100
  currentFile: string;
}
```

#### `error`

错误事件。

```typescript
{
  type: 'error';
  code: string;
  message: string;
  details?: unknown;
}
```

---

## 数据类型

### Node

```typescript
interface Node {
  id: string;
  graphId: string;
  layer: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  label: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  properties: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}
```

### Edge

```typescript
interface Edge {
  id: string;
  graphId: string;
  sourceId: string;
  targetId: string;
  type: 'depends_on' | 'contains' | 'implements' | 'imports' | 'refines';
  label?: string;
  properties: Record<string, unknown>;
  createdAt: number;
}
```

### ClarificationQuestion

```typescript
interface ClarificationQuestion {
  id: string;
  type: string;
  question: string;
  context: string;
  options: ClarificationOption[];
  priority: 'high' | 'medium' | 'low';
  required: boolean;
}
```

### ClarificationOption

```typescript
interface ClarificationOption {
  id: string;
  label: string;
  description: string;
  implications: string[];
  cost: 'low' | 'medium' | 'high';
  complexity: 'simple' | 'moderate' | 'complex';
  disabled?: boolean;
}
```

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| `GDD001` | Graph 不存在 |
| `GDD002` | 节点不存在 |
| `GDD003` | 边不存在 |
| `GDD004` | 会话不存在 |
| `GDD005` | 无效的参数 |
| `GDD006` | 索引失败 |
| `GDD007` | 导出失败 |
| `GDD008` | 导入失败 |
| `GDD009` | 模板不存在 |
| `GDD010` | 内部错误 |

---

## 示例

### 使用 Claude Code

```typescript
// 1. 初始化项目
await gdd_init({ name: 'my-project', path: '/path/to/project' });

// 2. 索引代码
await gdd_index_code({ graphId: 'xxx', projectPath: '/path/to/project' });

// 3. 启动 Brainstorm
const { sessionId, initialQuestions } = await gdd_brainstorm_start({
  graphId: 'xxx',
  requirement: '构建一个用户认证系统'
});

// 4. 回答问题
await gdd_brainstorm_answer({
  sessionId,
  questionId: initialQuestions[0].id,
  answer: 'React + TypeScript'
});
```

### 使用 CodeBuddy

```typescript
// 通过 MCP 协议调用
mcp.call('gdd_init', { name: 'my-project' });
mcp.call('gdd_index_code', { graphId: 'xxx', projectPath: '.' });
```

---

*最后更新: 2026-06-17*
