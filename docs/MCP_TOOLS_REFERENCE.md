# MCP 工具参考手册

本文档详细描述了 Graph-Driven Development (GDD) 提供的所有 MCP 工具。

## 目录

- [基础工具](#基础工具)
- [智能 Brainstorm 工具](#智能-brainstorm-工具)
- [错误处理](#错误处理)
- [示例](#示例)

---

## 基础工具

### gdd_create_graph

创建新的图驱动开发项目。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| name | string | 是 | 项目名称 |
| description | string | 否 | 项目描述 |

**返回：**

```json
{
  "success": true,
  "graph_id": "g_1234567890",
  "name": "my-project",
  "description": "项目描述",
  "created_at": 1718544000000
}
```

**示例：**

```json
{
  "name": "gdd_create_graph",
  "arguments": {
    "name": "ecommerce-backend",
    "description": "电商平台后端服务"
  }
}
```

---

### gdd_load_graph

加载已有图谱或从代码库索引生成。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| path | string | 是 | 图谱路径或代码库路径 |
| auto_index | boolean | 否 | 是否自动索引代码，默认 true |

**返回：**

```json
{
  "success": true,
  "graph_id": "g_1234567890",
  "name": "my-project",
  "index_result": {
    "total_files": 45,
    "total_lines": 5000,
    "languages": ["TypeScript", "JavaScript"],
    "frameworks": ["React", "Node.js"]
  }
}
```

---

### gdd_add_node

在图谱中添加新节点。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| graph_id | string | 是 | 图谱 ID |
| layer | string | 是 | 节点层级：L1_Constitution, L2_TechStack, L3_Epic, L4_Story, L5_Task |
| label | string | 是 | 节点标签 |
| properties | object | 否 | 节点属性 |
| status | string | 否 | 节点状态：draft, reviewing, approved, implemented |

**返回：**

```json
{
  "success": true,
  "node_id": "node_1234567890",
  "layer": "L3_Epic",
  "label": "用户认证模块"
}
```

**示例：**

```json
{
  "name": "gdd_add_node",
  "arguments": {
    "graph_id": "g_1234567890",
    "layer": "L3_Epic",
    "label": "用户认证模块",
    "properties": {
      "priority": "high",
      "owner": "team-frontend"
    },
    "status": "draft"
  }
}
```

---

### gdd_update_node

更新图谱中的节点。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| graph_id | string | 是 | 图谱 ID |
| node_id | string | 是 | 节点 ID |
| label | string | 否 | 新标签 |
| properties | object | 否 | 新属性 |
| status | string | 否 | 新状态 |

**返回：**

```json
{
  "success": true,
  "node_id": "node_1234567890",
  "updated_fields": ["label", "status"]
}
```

---

### gdd_delete_node

从图谱中删除节点及其相关边。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| graph_id | string | 是 | 图谱 ID |
| node_id | string | 是 | 节点 ID |

**返回：**

```json
{
  "success": true,
  "node_id": "node_1234567890",
  "deleted_edges": 5
}
```

---

### gdd_add_edge

在两个节点间创建连接。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| graph_id | string | 是 | 图谱 ID |
| source | string | 是 | 源节点 ID |
| target | string | 是 | 目标节点 ID |
| type | string | 是 | 边类型：depends_on, contains, implements, refines |
| label | string | 否 | 边标签 |

**返回：**

```json
{
  "success": true,
  "edge_id": "edge_1234567890",
  "source": "node_epic_1",
  "target": "node_story_1",
  "type": "contains"
}
```

---

### gdd_delete_edge

删除图谱中的边。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| graph_id | string | 是 | 图谱 ID |
| edge_id | string | 是 | 边 ID |

**返回：**

```json
{
  "success": true,
  "edge_id": "edge_1234567890"
}
```

---

### gdd_get_pending_clarifications

获取当前图谱中需要用户澄清的问题。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| graph_id | string | 是 | 图谱 ID |

**返回：**

```json
{
  "success": true,
  "questions": [
    {
      "id": "q_1",
      "type": "tech_stack",
      "question": "请选择主要的后端技术栈",
      "options": [
        { "id": "node", "label": "Node.js + Express" },
        { "id": "python", "label": "Python + FastAPI" }
      ],
      "status": "pending"
    }
  ],
  "total": 1
}
```

---

### gdd_submit_clarification_answer

提交用户对澄清问题的答案。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| graph_id | string | 是 | 图谱 ID |
| session_id | string | 是 | Brainstorm 会话 ID |
| question_id | string | 是 | 问题 ID |
| answer | string | 是 | 用户答案 |

**返回：**

```json
{
  "success": true,
  "session_id": "bs_1234567890",
  "question_id": "q_1",
  "answer": "node",
  "next_question": {
    "id": "q_2",
    "type": "database",
    "question": "请选择数据库方案"
  }
}
```

---

### gdd_get_dependency_impact

分析修改某个节点对其他节点的影响。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| graph_id | string | 是 | 图谱 ID |
| node_id | string | 是 | 节点 ID |

**返回：**

```json
{
  "success": true,
  "node_id": "node_1234567890",
  "direct_dependencies": [
    {
      "node_id": "node_2",
      "label": "登录页面",
      "edge_type": "implements"
    }
  ],
  "indirect_dependencies": [
    {
      "node_id": "node_3",
      "label": "用户资料编辑",
      "distance": 2
    }
  ],
  "impact_assessment": "medium"
}
```

---

### gdd_export_graph

导出图谱为 JSON、Markdown 或其他格式。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| graph_id | string | 是 | 图谱 ID |
| format | string | 否 | 导出格式：json, markdown, mermaid，默认 json |

**返回：**

```json
{
  "success": true,
  "format": "json",
  "content": "{\"nodes\":[...],\"edges\":[...]}",
  "size": 1024
}
```

**Markdown 格式示例：**

```markdown
# 项目图谱

## L1 - 宪法层
- [ ] 项目愿景

## L2 - 技术栈层
- [x] Node.js
- [x] React

## L3 - Epic 层
- [ ] 用户认证
- [ ] 订单管理
```

---

### gdd_list_graphs

列出所有图谱项目。

**参数：** 无

**返回：**

```json
{
  "success": true,
  "graphs": [
    {
      "id": "g_1",
      "name": "project-alpha",
      "description": "Alpha 项目",
      "created_at": 1718544000000,
      "updated_at": 1718544000000
    }
  ],
  "total": 1
}
```

---

## 智能 Brainstorm 工具

### gdd_smart_start_session

启动智能 Brainstorm 会话（自动分析代码上下文）。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| user_input | string | 是 | 用户输入 |
| graph_id | string | 否 | 图谱 ID |
| code_paths | string[] | 否 | 代码路径列表 |
| auto_index | boolean | 否 | 是否自动索引代码，默认 true |

**返回：**

```json
{
  "success": true,
  "session_id": "bs_1234567890",
  "state": "CLARIFY",
  "project_context": {
    "languages": ["TypeScript"],
    "frameworks": ["React", "Node.js"],
    "architecture_patterns": ["MVC", "Layered"],
    "confidence": 0.85,
    "gaps": ["测试覆盖不足", "缺少 CI/CD 配置"]
  },
  "first_question": {
    "id": "q_1",
    "type": "feature_scope",
    "question": "请选择主要功能范围"
  }
}
```

---

### gdd_smart_get_next_question

获取下一个智能澄清问题。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| session_id | string | 是 | Brainstorm 会话 ID |

**返回：**

```json
{
  "success": true,
  "session_id": "bs_1234567890",
  "state": "CLARIFY",
  "progress": {
    "answered": 2,
    "total": 8,
    "percentage": 25
  },
  "question": {
    "id": "q_3",
    "type": "data_model",
    "question": "请选择数据存储方案",
    "options": [
      { "id": "sql", "label": "SQL 数据库", "description": "结构化数据存储" },
      { "id": "nosql", "label": "NoSQL 数据库", "description": "非结构化数据存储" }
    ],
    "context": "检测到项目可能需要持久化存储",
    "priority": "high"
  }
}
```

---

### gdd_smart_answer_question

回答智能问题并更新上下文。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| session_id | string | 是 | Brainstorm 会话 ID |
| question_id | string | 是 | 问题 ID |
| answer | string | 是 | 用户答案 |

**返回：**

```json
{
  "success": true,
  "session_id": "bs_1234567890",
  "question_id": "q_3",
  "answer": "sql",
  "context_updated": {
    "frameworks": ["PostgreSQL"],
    "gaps": []
  },
  "inference_recorded": {
    "id": "inf_1",
    "input": "用户选择了 SQL 数据库",
    "inference": "项目将使用 PostgreSQL",
    "confidence": 0.9
  },
  "next_question": {
    "id": "q_4",
    "type": "security",
    "question": "请选择安全策略级别"
  }
}
```

---

### gdd_smart_get_progress

获取智能会话进度。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| session_id | string | 是 | Brainstorm 会话 ID |

**返回：**

```json
{
  "success": true,
  "session_id": "bs_1234567890",
  "state": "CLARIFY",
  "progress": {
    "answered": 5,
    "total": 8,
    "percentage": 62.5,
    "estimated_remaining": 2
  },
  "answered_questions": [
    { "question_id": "q_1", "answer": "full_stack" },
    { "question_id": "q_2", "answer": "node" }
  ],
  "pending_questions": [
    { "question_id": "q_6", "question": "请选择部署方式" }
  ]
}
```

---

### gdd_smart_update_context

更新项目上下文。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| session_id | string | 是 | Brainstorm 会话 ID |
| context_updates | object | 是 | 上下文更新 |

**返回：**

```json
{
  "success": true,
  "session_id": "bs_1234567890",
  "context": {
    "languages": ["TypeScript"],
    "frameworks": ["React", "Node.js", "PostgreSQL"],
    "architecture_patterns": ["MVC"],
    "confidence": 0.95,
    "gaps": []
  }
}
```

---

### gdd_smart_get_inferences

获取推断历史。

**参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| session_id | string | 是 | Brainstorm 会话 ID |
| limit | number | 否 | 返回数量限制，默认 10 |

**返回：**

```json
{
  "success": true,
  "session_id": "bs_1234567890",
  "inferences": [
    {
      "id": "inf_1",
      "input": "用户选择了 Node.js",
      "inference": "项目将使用 Express 或 Nest.js 框架",
      "confidence": 0.85,
      "timestamp": 1718544000000
    }
  ],
  "total": 1
}
```

---

## 错误处理

### 错误码

| 错误码 | HTTP 状态 | 描述 |
|--------|-----------|------|
| VALIDATION_ERROR | 400 | 输入验证失败 |
| NOT_FOUND | 404 | 资源不存在 |
| ALREADY_EXISTS | 409 | 资源已存在 |
| UNAUTHORIZED | 401 | 未授权 |
| FORBIDDEN | 403 | 禁止访问 |
| DATABASE_ERROR | 500 | 数据库错误 |
| NETWORK_ERROR | 502 | 网络错误 |
| INTERNAL_ERROR | 500 | 内部错误 |

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "缺少必需参数: graph_id",
    "category": "validation",
    "severity": "low"
  }
}
```

---

## 示例

### 创建项目并添加节点

```json
// 1. 创建项目
{
  "name": "gdd_create_graph",
  "arguments": {
    "name": "my-app",
    "description": "我的应用"
  }
}

// 2. 添加 Epic 节点
{
  "name": "gdd_add_node",
  "arguments": {
    "graph_id": "g_123",
    "layer": "L3_Epic",
    "label": "用户管理"
  }
}

// 3. 添加 Story 节点
{
  "name": "gdd_add_node",
  "arguments": {
    "graph_id": "g_123",
    "layer": "L4_Story",
    "label": "用户登录"
  }
}

// 4. 创建父子关系
{
  "name": "gdd_add_edge",
  "arguments": {
    "graph_id": "g_123",
    "source": "node_epic_1",
    "target": "node_story_1",
    "type": "contains"
  }
}
```

### 智能 Brainstorm 流程

```json
// 1. 启动智能会话
{
  "name": "gdd_smart_start_session",
  "arguments": {
    "user_input": "我想创建一个电商平台",
    "code_paths": ["/path/to/code"]
  }
}

// 2. 获取问题并回答
{
  "name": "gdd_smart_get_next_question",
  "arguments": {
    "session_id": "bs_123"
  }
}

{
  "name": "gdd_smart_answer_question",
  "arguments": {
    "session_id": "bs_123",
    "question_id": "q_1",
    "answer": "full_stack"
  }
}

// 3. 查看进度
{
  "name": "gdd_smart_get_progress",
  "arguments": {
    "session_id": "bs_123"
  }
}
```
