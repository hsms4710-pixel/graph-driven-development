# Graph-Driven Development

> 从想法到代码，用图驱动整个开发流程。

Graph-Driven Development (GDD) 是一个创新的开发工具，让你：

- **从零开始**：用自然语言描述想法，AI 提取功能节点，在图上编排设计，一键生成代码
- **维护已有项目**：索引代码库生成架构图，可视化理解依赖关系，安全修改代码

## 核心特性

### 1. 智能需求提取
```
输入: "做一个 Todo App，支持用户登录、任务的增删改查"
输出: 功能节点图 (用户认证 → 任务CRUD → 数据存储 → UI界面)
```

### 2. 可视化图编辑
- 拖拽节点调整架构
- 连线表示依赖关系
- 实时预览代码量估算

### 3. 拓扑排序并行生成
- 按依赖顺序并行生成代码
- 速度提升 3-4x (RPG 论文验证)
- 自动处理接口契约

### 4. 变更影响分析
- 选中函数 → 高亮所有下游调用者
- 风险评分：基于调用链深度 + 测试覆盖度
- 改图 → 代码自动增量更新

## 快速开始

### 安装

```bash
npm install
```

### 从零开发

```bash
# 启动 Web 界面
npm run dev

# 或使用 CLI
npx gdd new "做一个 Todo App"
```

### 索引已有代码库

```bash
# 索引项目
npx gdd index ./your-project

# 打开可视化编辑器
npx gdd open
```

## 项目结构

```
graph-driven-development/
├── src/
│   ├── core/        # 图谱引擎核心
│   │   ├── graph.ts       # 图数据结构
│   │   ├── node.ts        # 节点定义
│   │   ├── edge.ts        # 边定义
│   │   └── serializer.ts  # 序列化/反序列化
│   ├── editor/      # 图可视化编辑器
│   │   ├── GraphEditor.tsx
│   │   ├── NodeComponent.tsx
│   │   └── EdgeComponent.tsx
│   ├── generator/   # 代码生成器
│   │   ├── CodeGenerator.ts
│   │   ├── TopologySorter.ts
│   │   └── TemplateEngine.ts
│   ├── indexer/     # 代码库索引器
│   │   ├── CodeIndexer.ts
│   │   ├── ASTParser.ts
│   │   └── DependencyAnalyzer.ts
│   └── cli/         # 命令行工具
│       └── index.ts
├── tests/           # 测试用例
├── examples/        # 示例项目
├── docs/            # 文档
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 开发路线图

- [x] 项目骨架搭建
- [ ] 图谱引擎核心实现
- [ ] 图可视化编辑器
- [ ] 代码生成器
- [ ] 代码库索引器
- [ ] VS Code Extension
- [ ] 团队协作功能

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
