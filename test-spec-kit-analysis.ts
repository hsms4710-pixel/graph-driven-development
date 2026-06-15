/**
 * Graph-Driven Development - Spec Kit 项目分析测试
 *
 * 用 GitHub Spec Kit 项目验证 Graph-Driven Development 的完整流程
 */

import { GraphStore } from './store/graphStore';
import { LayerType } from './types';

// ==================== Spec Kit 项目结构分析 ====================

interface SpecKitAnalysis {
  project: string;
  layers: {
    L1_Constitution: LayerAnalysis;
    L2_TechStack: LayerAnalysis;
    L3_Epic: LayerAnalysis;
    L4_Story: LayerAnalysis;
    L5_Task: LayerAnalysis;
  };
  connections: ConnectionAnalysis[];
}

interface LayerAnalysis {
  name: string;
  items: LayerItem[];
}

interface LayerItem {
  id: string;
  title: string;
  description: string;
  sourceFile: string;
  properties: Record<string, string>;
}

interface ConnectionAnalysis {
  from: string;
  to: string;
  type: 'depends_on' | 'contains' | 'implements' | 'refines';
  description: string;
}

// ==================== 分析 GitHub Spec Kit ====================

function analyzeSpecKit(): SpecKitAnalysis {
  return {
    project: 'GitHub Spec Kit',
    layers: {
      L1_Constitution: {
        name: '项目宪法 & 核心原则',
        items: [
          {
            id: 'L1-001',
            title: '规范优先原则',
            description: '规格说明(Spec)是主要产物，代码是规格说明的表达形式',
            sourceFile: 'spec-driven.md',
            properties: {
              '原则': 'Specifications as the Lingua Franca',
              '描述': '维护软件意味着演进规格说明',
            },
          },
          {
            id: 'L1-002',
            title: '可执行规格说明',
            description: '规格说明必须足够精确、完整、无歧义，能够生成可工作的系统',
            sourceFile: 'spec-driven.md',
            properties: {
              '原则': 'Executable Specifications',
              '描述': '消除意图与实现之间的差距',
            },
          },
          {
            id: 'L1-003',
            title: '持续优化',
            description: '一致性验证是持续进行的，而不是一次性门控',
            sourceFile: 'spec-driven.md',
            properties: {
              '原则': 'Continuous Refinement',
              '描述': 'AI 持续分析规格说明的歧义、矛盾和缺口',
            },
          },
          {
            id: 'L1-004',
            title: '研究驱动的上下文',
            description: '研究代理在整个规格说明过程中收集关键上下文',
            sourceFile: 'spec-driven.md',
            properties: {
              '原则': 'Research-Driven Context',
              '描述': '调查技术选项、性能影响和组织约束',
            },
          },
        ],
      },
      L2_TechStack: {
        name: '技术栈 & 工具链',
        items: [
          {
            id: 'L2-001',
            title: 'Specify CLI',
            description: '命令行界面，用于初始化项目并设置 Spec Kit 框架',
            sourceFile: 'src/specify_cli/',
            properties: {
              '语言': 'Python',
              '功能': '项目初始化、命令管理、集成配置',
            },
          },
          {
            id: 'L2-002',
            title: 'AI 编码助手集成',
            description: '支持多种 AI 编码助手的集成框架',
            sourceFile: 'src/specify_cli/integrations/',
            properties: {
              '支持': 'Claude Code, Gemini CLI, Copilot, Cursor, Windsurf',
              '架构': 'IntegrationBase 抽象基类',
            },
          },
          {
            id: 'L2-003',
            title: '工作流引擎',
            description: 'YAML 定义的工作流执行引擎',
            sourceFile: 'src/specify_cli/workflows/',
            properties: {
              '步骤类型': 'command, shell, gate, if, switch, while, fan-out, fan-in',
              '状态': 'CREATED, RUNNING, COMPLETED, PAUSED, FAILED, ABORTED',
            },
          },
          {
            id: 'L2-004',
            title: '模板系统',
            description: '规格说明、计划、任务的模板定义',
            sourceFile: 'templates/',
            properties: {
              '模板': 'spec-template.md, plan-template.md, tasks-template.md',
              '变量': '$ARGUMENTS, __SPECKIT_COMMAND_*__',
            },
          },
        ],
      },
      L3_Epic: {
        name: '核心功能范围 (Epic)',
        items: [
          {
            id: 'L3-001',
            title: '/speckit.specify 命令',
            description: '将简单功能描述转换为完整的结构化规格说明',
            sourceFile: 'templates/spec-template.md',
            properties: {
              '自动编号': '扫描现有规格说明确定下一个编号',
              '分支创建': '自动生成语义化分支名',
              '目录结构': 'specs/[branch-name]/',
            },
          },
          {
            id: 'L3-002',
            title: '/speckit.plan 命令',
            description: '从功能规格说明创建全面的实施计划',
            sourceFile: 'templates/plan-template.md',
            properties: {
              '规格分析': '读取功能要求、用户故事和验收标准',
              '宪法合规': '确保与项目宪法和架构原则一致',
              '技术翻译': '将业务需求转换为技术架构和实施细节',
            },
          },
          {
            id: 'L3-003',
            title: '/speckit.tasks 命令',
            description: '分析计划和相关设计文档，生成可执行的任务列表',
            sourceFile: 'templates/tasks-template.md',
            properties: {
              '输入': 'plan.md, data-model.md, contracts/, research.md',
              '组织': '按用户故事分组，支持独立实施和测试',
              '并行标记': '[P] 标记可并行执行的任务',
            },
          },
          {
            id: 'L3-004',
            title: '工作流系统',
            description: '基于 YAML 定义的工作流执行引擎',
            sourceFile: 'workflows/',
            properties: {
              '执行模型': '顺序执行、状态持久化、断点续传',
              '步骤类型': '10 种内置步骤类型',
              '目录': 'catalog.json, catalog.community.json',
            },
          },
        ],
      },
      L4_Story: {
        name: '用户故事 (Story)',
        items: [
          {
            id: 'L4-001',
            title: '产品管理者的规格说明流程',
            description: '产品管理者更新验收标准，实施计划自动标记受影响的技术决策',
            sourceFile: 'spec-driven.md',
            properties: {
              '角色': '产品经理',
              '价值': '规格说明变更自动传播到技术决策',
            },
          },
          {
            id: 'L4-002',
            title: '架构师的规格说明流程',
            description: '架构师发现更好的模式，PRD 更新以反映新可能性',
            sourceFile: 'spec-driven.md',
            properties: {
              '角色': '架构师',
              '价值': '架构优化自动反映到规格说明',
            },
          },
          {
            id: 'L4-003',
            title: '开发者的工作流集成',
            description: '开发者使用偏好的 AI 工具，同时保持一致的项目结构和开发实践',
            sourceFile: 'AGENTS.md',
            properties: {
              '角色': '开发者',
              '价值': '工具无关的统一开发流程',
            },
          },
          {
            id: 'L4-004',
            title: '团队协作的规格说明管理',
            description: '团队评审的规格说明被表达和版本化，创建在分支中，合并',
            sourceFile: 'spec-driven.md',
            properties: {
              '角色': '团队',
              '价值': '规格说明作为版本控制的主要产物',
            },
          },
        ],
      },
      L5_Task: {
        name: '具体任务 (Task)',
        items: [
          {
            id: 'L5-001',
            title: '初始化项目结构',
            description: '使用 specify init 创建项目',
            sourceFile: 'src/specify_cli/',
            properties: {
              '命令': 'specify init',
              '输出': '项目目录结构、模板文件、AI 集成配置',
            },
          },
          {
            id: 'L5-002',
            title: '创建功能规格说明',
            description: '使用 /speckit.specify 命令从描述生成规格说明',
            sourceFile: 'templates/spec-template.md',
            properties: {
              '输入': '用户描述',
              '输出': 'specs/[branch]/spec.md',
            },
          },
          {
            id: 'L5-003',
            title: '生成实施计划',
            description: '使用 /speckit.plan 命令从规格说明生成计划',
            sourceFile: 'templates/plan-template.md',
            properties: {
              '输入': 'spec.md',
              '输出': 'specs/[branch]/plan.md, data-model.md, contracts/',
            },
          },
          {
            id: 'L5-004',
            title: '分解任务',
            description: '使用 /speckit.tasks 命令从计划生成任务列表',
            sourceFile: 'templates/tasks-template.md',
            properties: {
              '输入': 'plan.md, data-model.md, contracts/',
              '输出': 'specs/[branch]/tasks.md',
            },
          },
          {
            id: 'L5-005',
            title: '执行任务生成代码',
            description: '使用 AI 助手执行任务列表中的每个任务',
            sourceFile: 'AGENTS.md',
            properties: {
              '输入': 'tasks.md',
              '输出': '可工作的代码',
            },
          },
        ],
      },
    },
    connections: [
      {
        from: 'L1-001',
        to: 'L2-001',
        type: 'refines',
        description: 'Specify CLI 实现规范优先原则',
      },
      {
        from: 'L1-002',
        to: 'L2-004',
        type: 'implements',
        description: '模板系统提供可执行规格说明的载体',
      },
      {
        from: 'L2-001',
        to: 'L2-002',
        type: 'contains',
        description: 'CLI 包含 AI 集成模块',
      },
      {
        from: 'L2-001',
        to: 'L2-003',
        type: 'contains',
        description: 'CLI 包含工作流引擎',
      },
      {
        from: 'L3-001',
        to: 'L2-004',
        type: 'uses',
        description: 'specify 命令使用 spec-template.md',
      },
      {
        from: 'L3-002',
        to: 'L2-004',
        type: 'uses',
        description: 'plan 命令使用 plan-template.md',
      },
      {
        from: 'L3-003',
        to: 'L2-004',
        type: 'uses',
        description: 'tasks 命令使用 tasks-template.md',
      },
      {
        from: 'L3-004',
        to: 'L2-003',
        type: 'implements',
        description: '工作流系统实现工作流引擎',
      },
      {
        from: 'L4-001',
        to: 'L3-001',
        type: 'uses',
        description: '产品管理者使用 specify 命令',
      },
      {
        from: 'L4-002',
        to: 'L3-001',
        type: 'uses',
        description: '架构师使用 specify 命令',
      },
      {
        from: 'L4-003',
        to: 'L3-001',
        type: 'uses',
        description: '开发者使用 specify 命令',
      },
      {
        from: 'L4-003',
        to: 'L3-002',
        type: 'uses',
        description: '开发者使用 plan 命令',
      },
      {
        from: 'L4-003',
        to: 'L3-003',
        type: 'uses',
        description: '开发者使用 tasks 命令',
        },
      {
        from: 'L4-004',
        to: 'L3-001',
        type: 'uses',
        description: '团队使用 specify 命令',
      },
      {
        from: 'L5-001',
        to: 'L3-001',
        type: 'implements',
        description: '初始化任务实现 specify 命令',
      },
      {
        from: 'L5-002',
        to: 'L3-001',
        type: 'implements',
        description: '创建规格说明任务实现 specify 命令',
      },
      {
        from: 'L5-003',
        to: 'L3-002',
        type: 'implements',
        description: '生成计划任务实现 plan 命令',
      },
      {
        from: 'L5-004',
        to: 'L3-003',
        type: 'implements',
        description: '分解任务实现 tasks 命令',
      },
      {
        from: 'L5-005',
        to: 'L3-003',
        type: 'implements',
        description: '执行任务实现 tasks 命令',
      },
      {
        from: 'L5-002',
        to: 'L5-003',
        type: 'depends_on',
        description: '生成计划依赖于规格说明',
      },
      {
        from: 'L5-003',
        to: 'L5-004',
        type: 'depends_on',
        description: '分解任务依赖于计划',
      },
      {
        from: 'L5-004',
        to: 'L5-005',
        type: 'depends_on',
        description: '执行任务依赖于任务列表',
      },
    ],
  };
}

// ==================== 转换为 Graph-Driven Development 数据 ====================

function convertToGraphData(analysis: SpecKitAnalysis) {
  const nodes: any[] = [];
  const edges: any[] = [];

  // 层级颜色映射
  const layerColors = {
    L1_Constitution: '#8e44ad',
    L2_TechStack: '#3498db',
    L3_Epic: '#27ae60',
    L4_Story: '#e67e22',
    L5_Task: '#e74c3c',
  };

  // 层级图标
  const layerIcons = {
    L1_Constitution: '📜',
    L2_TechStack: '🔧',
    L3_Epic: '📋',
    L4_Story: '📝',
    L5_Task: '⚡',
  };

  // 处理每个层级
  for (const [layerType, layerData] of Object.entries(analysis.layers)) {
    const items = layerData.items;
    const color = layerColors[layerType as keyof typeof layerColors];
    const icon = layerIcons[layerType as keyof typeof layerIcons];

    items.forEach((item, index) => {
      nodes.push({
        id: item.id,
        label: `${icon} ${item.title}`,
        type: 'custom',
        layer: layerType,
        layerLabel: layerData.name,
        properties: {
          description: item.description,
          sourceFile: item.sourceFile,
          ...item.properties,
        },
        status: 'approved',
        // 网格布局
        position: {
          x: (layerType === 'L1_Constitution' ? 50 : 
               layerType === 'L2_TechStack' ? 250 :
               layerType === 'L3_Epic' ? 450 :
               layerType === 'L4_Story' ? 650 :
               layerType === 'L5_Task' ? 850 : 0),
          y: 100 + index * 80,
        },
        style: {
          background: `linear-gradient(135deg, ${color}33, ${color}11)`,
          border: `2px solid ${color}`,
          borderRadius: '12px',
          padding: '12px 16px',
          minWidth: '180px',
        },
      });
    });
  }

  // 处理连接
  analysis.connections.forEach((conn, index) => {
    edges.push({
      id: `edge-${index}`,
      source: conn.from,
      target: conn.to,
      type: conn.type,
      label: conn.description,
      style: {
        stroke: conn.type === 'depends_on' ? '#e74c3c' :
                conn.type === 'contains' ? '#27ae60' :
                conn.type === 'implements' ? '#e67e22' :
                '#8e44ad',
        strokeWidth: 2,
      },
    });
  });

  return { nodes, edges };
}

// ==================== Brainstorm 澄清问题 ====================

function generateClarificationQuestions(analysis: SpecKitAnalysis): any[] {
  return [
    {
      id: 'q-spec-001',
      question: 'Graph-Driven Development 与 Spec-Driven Development 的核心区别是什么？',
      hint: '理解两种方法论的定位差异',
      options: [
        {
          id: 'opt-1',
          label: 'GDD 更注重可视化，SDD 更注重文档化',
          implications: ['GDD 提供实时图谱视图', 'SDD 依赖 Markdown 文档'],
        },
        {
          id: 'opt-2',
          label: 'GDD 的图谱是实时双向同步的，SDD 是单向生成',
          implications: ['GDD 支持 Agent↔Graph 实时同步', 'SDD 是 Spec → Code 单向流程'],
        },
        {
          id: 'opt-3',
          label: '两者本质上相同，只是表达形式不同',
          implications: ['需要统一方法论', '可能造成团队认知分裂'],
        },
      ],
      status: 'pending',
    },
    {
      id: 'q-spec-002',
      question: '如何将 Spec Kit 的模板系统集成到 Graph-Driven Development？',
      hint: '考虑模板与图节点的映射关系',
      options: [
        {
          id: 'opt-2-1',
          label: '每个图节点类型对应一个模板',
          implications: ['标准化节点结构', '降低学习成本'],
        },
        {
          id: 'opt-2-2',
          label: '模板作为节点属性存储',
          implications: ['灵活的模板应用', '需要额外的模板引擎'],
        },
        {
          id: 'opt-2-3',
          label: '模板与图分离，通过 ID 关联',
          implications: ['清晰的关注点分离', '增加数据模型复杂度'],
        },
      ],
      status: 'pending',
    },
    {
      id: 'q-spec-003',
      question: '工作流引擎的状态机如何与 Brainstorm 状态机协调？',
      hint: '两个状态机的同步策略',
      options: [
        {
          id: 'opt-3-1',
          label: '统一状态机，合并两个状态空间',
          implications: ['单一状态源', '状态转换复杂度增加'],
        },
        {
          id: 'opt-3-2',
          label: '事件驱动的松耦合同步',
          implications: ['灵活的状态管理', '需要事件总线基础设施'],
        },
        {
          id: 'opt-3-3',
          label: '分层状态机，工作流在上层',
          implications: ['清晰的层次关系', 'Brainstorm 可能被过度抽象'],
        },
      ],
      status: 'pending',
    },
  ];
}

// ==================== 导出分析结果 ====================

function exportAnalysis(analysis: SpecKitAnalysis) {
  console.log('\n========================================');
  console.log('Graph-Driven Development 分析结果');
  console.log('========================================\n');

  console.log(`项目: ${analysis.project}`);
  console.log('\n5 层架构分析:\n');

  for (const [layerType, layerData] of Object.entries(analysis.layers)) {
    console.log(`\n${layerData.name} (${layerType}):`);
    console.log('  ' + '─'.repeat(50));
    layerData.items.forEach((item) => {
      console.log(`  ${item.id}: ${item.title}`);
      console.log(`    描述: ${item.description}`);
      console.log(`    来源: ${item.sourceFile}`);
      if (Object.keys(item.properties).length > 0) {
        console.log('    属性:');
        for (const [key, value] of Object.entries(item.properties)) {
          console.log(`      - ${key}: ${value}`);
        }
      }
      console.log('');
    });
  }

  console.log('\n连接关系分析:');
  console.log('  ' + '─'.repeat(50));
  analysis.connections.forEach((conn, index) => {
    console.log(`  ${index + 1}. ${conn.from} → ${conn.to}`);
    console.log(`     类型: ${conn.type}`);
    console.log(`     描述: ${conn.description}`);
    console.log('');
  });

  console.log('\n统计信息:');
  let totalNodes = 0;
  let totalEdges = analysis.connections.length;

  for (const layerData of Object.values(analysis.layers)) {
    totalNodes += layerData.items.length;
  }

  console.log(`  总节点数: ${totalNodes}`);
  console.log(`  总连接数: ${totalEdges}`);
  console.log('========================================\n');
}

// ==================== 主函数 ====================

async function main() {
  console.log('🚀 开始分析 GitHub Spec Kit 项目...\n');

  // 执行分析
  const analysis = analyzeSpecKit();

  // 导出结果
  exportAnalysis(analysis);

  // 转换为图数据
  const graphData = convertToGraphData(analysis);
  console.log(`\n生成的图数据: ${graphData.nodes.length} 个节点, ${graphData.edges.length} 条边`);

  // 生成澄清问题
  const questions = generateClarificationQuestions(analysis);
  console.log(`\n生成的澄清问题: ${questions.length} 个`);

  // 模拟保存到后端
  console.log('\n✅ 分析完成！可以将此数据导入 Graph-Driven Development 应用进行可视化展示');

  return { analysis, graphData, questions };
}

// 运行分析
main().catch(console.error);
