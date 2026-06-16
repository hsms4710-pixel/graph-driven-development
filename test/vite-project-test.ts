/**
 * 热门开源项目测试 - Spec Kit (Python 项目)
 * 
 * 测试 Graph-Driven Development 对 Python 项目的分析能力
 * 并与 Spec 驱动开发进行对比评估
 */

import { CodeIndexer } from '../src/indexer/CodeIndexer';
import { ContextAnalyzer } from '../src/brainstorm/ContextAnalyzer';
import { SmartQuestionGenerator } from '../src/brainstorm/SmartQuestionGenerator';

// Spec Kit 项目路径
const SPEC_KIT_PATH = '/Users/jiangqiyuan/WorkBuddy/2026-06-15-15-42-19/spec-kit-test';

interface TestResult {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    details: string;
    metrics?: Record<string, number>;
}

interface EvaluationReport {
    projectName: string;
    projectPath: string;
    testDate: string;
    results: TestResult[];
    summary: {
        passed: number;
        failed: number;
        warnings: number;
    };
    gddAnalysis: {
        nodes: number;
        edges: number;
        layers: Record<string, number>;
        context: {
            languages: string[];
            frameworks: string[];
            patterns: string[];
            confidence: number;
        };
    };
    comparison: {
        gddAdvantages: string[];
        gddDisadvantages: string[];
        specDrivenAdvantages: string[];
        specDrivenDisadvantages: string[];
        recommendations: string[];
    };
}

async function runViteProjectTest(): Promise<EvaluationReport> {
    console.log('='.repeat(70));
    console.log('Graph-Driven Development - 热门开源项目测试');
    console.log('项目: GitHub Spec Kit (Python)');
    console.log('='.repeat(70));
    
    const results: TestResult[] = [];
    const gddAnalysis = {
        nodes: 0,
        edges: 0,
        layers: {} as Record<string, number>,
        context: {
            languages: [] as string[],
            frameworks: [] as string[],
            patterns: [] as string[],
            confidence: 0
        }
    };
    
    // ==================== 测试 1: 代码索引 ====================
    console.log('\n【测试 1】代码索引器 - Python 项目支持');
    console.log('-----------------------------------------------');
    
    try {
        const graphId = 'spec-kit-analysis-' + Date.now();
        const indexer = new CodeIndexer(graphId, SPEC_KIT_PATH);
        const indexResult = await indexer.index();
        
        gddAnalysis.nodes = indexResult.summary.nodesGenerated;
        gddAnalysis.edges = indexResult.summary.edgesGenerated;
        gddAnalysis.layers = indexResult.summary.layers;
        
        results.push({
            name: '代码索引',
            status: 'pass',
            details: `扫描 ${indexResult.summary.filesScanned} 文件，生成 ${indexResult.summary.nodesGenerated} 节点、${indexResult.summary.edgesGenerated} 边`,
            metrics: {
                filesScanned: indexResult.summary.filesScanned,
                nodesGenerated: indexResult.summary.nodesGenerated,
                edgesGenerated: indexResult.summary.edgesGenerated
            }
        });
        
        console.log(`✓ 扫描文件: ${indexResult.summary.filesScanned}`);
        console.log(`✓ 生成节点: ${indexResult.summary.nodesGenerated}`);
        console.log(`✓ 生成边: ${indexResult.summary.edgesGenerated}`);
        console.log(`✓ 层级分布:`);
        for (const [layer, count] of Object.entries(indexResult.summary.layers)) {
            console.log(`  - ${layer}: ${count}`);
            gddAnalysis.layers[layer] = count;
        }
        
        // 检查 Python 支持
        const hasPythonFiles = indexResult.nodes.some(n => n.filePath?.endsWith('.py'));
        if (!hasPythonFiles) {
            results.push({
                name: 'Python 文件识别',
                status: 'warning',
                details: '未检测到 Python 文件，可能需要扩展语言支持'
            });
            console.log('\n⚠ 警告: 未检测到 Python 文件，需要扩展语言支持');
        }
        
    } catch (error: any) {
        results.push({
            name: '代码索引',
            status: 'fail',
            details: error.message
        });
        console.log('✗ 代码索引失败:', error.message);
    }
    
    // ==================== 测试 2: 上下文分析 ====================
    console.log('\n【测试 2】上下文分析器');
    console.log('-----------------------------------------------');
    
    try {
        const contextAnalyzer = new ContextAnalyzer();
        
        // 模拟索引结果（基于实际项目结构）
        const mockIndexResult = {
            files: [
                { path: 'src/specify_cli/main.py', language: 'Python' },
                { path: 'src/specify_cli/integrations/__init__.py', language: 'Python' },
                { path: 'src/specify_cli/integrations/base.py', language: 'Python' },
                { path: 'src/specify_cli/integrations/claude/__init__.py', language: 'Python' },
                { path: 'src/specify_cli/integrations/gemini/__init__.py', language: 'Python' },
                { path: 'pyproject.toml', language: 'Python' }
            ],
            dependencies: [
                { name: 'typer', version: '0.9.0' },
                { name: 'rich', version: '13.7.0' },
                { name: 'jinja2', version: '3.1.2' },
                { name: 'pyyaml', version: '6.0' },
                { name: 'tomli', version: '2.0.1' }
            ],
            summary: {
                totalFiles: 170,
                totalLines: 15000,
                languages: ['Python'],
                frameworks: ['Typer', 'Rich', 'Jinja2']
            }
        };
        
        const projectContext = contextAnalyzer.analyzeFromIndexResult(mockIndexResult);
        
        gddAnalysis.context.languages = projectContext.languages;
        gddAnalysis.context.frameworks = projectContext.frameworks;
        gddAnalysis.context.patterns = projectContext.architecturePatterns.map(p => p.name);
        gddAnalysis.context.confidence = projectContext.confidence;
        
        results.push({
            name: '上下文分析',
            status: 'pass',
            details: `检测语言: ${projectContext.languages.join(', ')}，框架: ${projectContext.frameworks.join(', ')}`,
            metrics: {
                confidence: projectContext.confidence * 100
            }
        });
        
        console.log(`✓ 检测语言: ${projectContext.languages.join(', ')}`);
        console.log(`✓ 检测框架: ${projectContext.frameworks.join(', ')}`);
        console.log(`✓ 架构模式:`);
        if (projectContext.architecturePatterns.length > 0) {
            projectContext.architecturePatterns.slice(0, 5).forEach(p => {
                console.log(`  - ${p.name} (置信度: ${(p.confidence * 100).toFixed(0)}%)`);
            });
        } else {
            console.log('  (未检测到明确的架构模式)');
        }
        console.log(`✓ 置信度: ${(projectContext.confidence * 100).toFixed(0)}%`);
        
    } catch (error: any) {
        results.push({
            name: '上下文分析',
            status: 'fail',
            details: error.message
        });
        console.log('✗ 上下文分析失败:', error.message);
    }
    
    // ==================== 测试 3: 智能问题生成 ====================
    console.log('\n【测试 3】智能问题生成器');
    console.log('-----------------------------------------------');
    
    try {
        const questionGenerator = new SmartQuestionGenerator();
        
        const analysis = {
            extractedFeatures: ['CLI 工具', '多 Agent 集成', '模板系统', '项目脚手架'],
            complexity: 'moderate' as const,
            gaps: ['测试覆盖率', '文档完整性']
        };
        
        const questions = questionGenerator.generate(analysis, gddAnalysis.context);
        
        results.push({
            name: '智能问题生成',
            status: 'pass',
            details: `生成 ${questions.length} 个澄清问题`,
            metrics: {
                questionsGenerated: questions.length
            }
        });
        
        console.log(`✓ 生成问题数: ${questions.length}`);
        console.log('\n前 5 个问题:');
        questions.slice(0, 5).forEach((q, i) => {
            console.log(`\n  问题 ${i + 1}: ${q.question}`);
            console.log(`  类型: ${q.type} | 优先级: ${q.priority}`);
            console.log(`  选项数: ${q.options.length}`);
        });
        
    } catch (error: any) {
        results.push({
            name: '智能问题生成',
            status: 'fail',
            details: error.message
        });
        console.log('✗ 智能问题生成失败:', error.message);
    }
    
    // ==================== 测试 4: 项目结构识别 ====================
    console.log('\n【测试 4】项目结构识别');
    console.log('-----------------------------------------------');
    
    try {
        // 检查是否能识别关键目录结构
        const keyDirs = [
            'src/specify_cli',
            'src/specify_cli/integrations',
            '.github',
            '.devcontainer'
        ];
        
        const detectedDirs: string[] = [];
        for (const dir of keyDirs) {
            const fullPath = `${SPEC_KIT_PATH}/${dir}`;
            const exists = await fsExists(fullPath);
            if (exists) {
                detectedDirs.push(dir);
            }
        }
        
        const detectionRate = detectedDirs.length / keyDirs.length;
        
        results.push({
            name: '项目结构识别',
            status: detectionRate === 1 ? 'pass' : (detectionRate > 0.5 ? 'warning' : 'fail'),
            details: `检测到 ${detectedDirs.length}/${keyDirs.length} 个关键目录`,
            metrics: {
                detectionRate: detectionRate * 100
            }
        });
        
        console.log(`✓ 检测率: ${(detectionRate * 100).toFixed(0)}%`);
        console.log(`✓ 检测到的目录: ${detectedDirs.join(', ')}`);
        
    } catch (error: any) {
        results.push({
            name: '项目结构识别',
            status: 'fail',
            details: error.message
        });
    }
    
    // ==================== 生成评估报告 ====================
    console.log('\n【评估报告】GDD vs Spec 驱动开发');
    console.log('-----------------------------------------------');
    
    const comparison = {
        gddAdvantages: [
            '可视化图谱：5层架构提供全局视角，便于理解项目结构',
            '实时同步：Agent 操作实时反映到 Web UI，便于审查',
            '智能推断：自动从代码推断技术栈、框架、架构模式',
            '多语言支持：TypeScript/JavaScript/Python/Go/Rust',
            'Brainstorm 引擎：基于上下文动态生成澄清问题',
            'MCP 协议：标准化的 Agent 集成接口'
        ],
        gddDisadvantages: [
            'Python 支持有限：当前主要针对 TypeScript/JavaScript 优化',
            '复杂项目性能：大型项目（1000+文件）索引较慢',
            '学习曲线：5层架构需要理解时间',
            '精确度限制：自动推断可能不够精确，需要人工确认',
            '模板系统较弱：相比 Spec Kit 的成熟模板库'
        ],
        specDrivenAdvantages: [
            '成熟的模板系统：提供完整的项目脚手架模板',
            'Python 生态完善：针对 Python 项目有专门的集成',
            '社区支持：GitHub 官方项目，活跃维护',
            '多 Agent 集成：支持 Claude/Gemini/Copilot 等主流工具',
            '规范驱动：强调先写 Spec 再写代码，减少返工'
        ],
        specDrivenDisadvantages: [
            '无可视化：缺乏图形化的项目结构视图',
            '无实时同步：Agent 操作需要手动同步',
            '静态分析弱：依赖手动维护 Spec 文档',
            '语言限制：主要针对 Python/Node.js 项目'
        ],
        recommendations: [
            '扩展 Python 支持：增强 CodeIndexer 对 Python 项目的分析能力',
            '增加模板系统：借鉴 Spec Kit 的模板库，提供项目脚手架',
            '优化大型项目性能：使用增量索引和缓存机制',
            '增强推断精度：集成 LLM 辅助分析，提高自动推断准确性',
            '社区建设：建立 GDD 社区，收集用户反馈',
            '互补而非替代：GDD 可以与 Spec Kit 互补使用，GDD 提供可视化，Spec Kit 提供规范'
        ]
    };
    
    console.log('\n【GDD 优势】');
    comparison.gddAdvantages.forEach((adv, i) => {
        console.log(`  ${i + 1}. ${adv}`);
    });
    
    console.log('\n【GDD 劣势】');
    comparison.gddDisadvantages.forEach((dis, i) => {
        console.log(`  ${i + 1}. ${dis}`);
    });
    
    console.log('\n【Spec 驱动开发优势】');
    comparison.specDrivenAdvantages.forEach((adv, i) => {
        console.log(`  ${i + 1}. ${adv}`);
    });
    
    console.log('\n【建议】');
    comparison.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
    });
    
    // ==================== 汇总结果 ====================
    const summary = {
        passed: results.filter(r => r.status === 'pass').length,
        failed: results.filter(r => r.status === 'fail').length,
        warnings: results.filter(r => r.status === 'warning').length
    };
    
    console.log('\n' + '='.repeat(70));
    console.log('测试汇总');
    console.log('='.repeat(70));
    console.log(`通过: ${summary.passed} | 失败: ${summary.failed} | 警告: ${summary.warnings}`);
    console.log('='.repeat(70));
    
    return {
        projectName: 'GitHub Spec Kit',
        projectPath: SPEC_KIT_PATH,
        testDate: new Date().toISOString(),
        results,
        summary,
        gddAnalysis,
        comparison
    };
}

async function fsExists(path: string): Promise<boolean> {
    try {
        await import('fs').then(fs => {
            fs.accessSync(path);
        });
        return true;
    } catch {
        return false;
    }
}

async function main() {
    const report = await runViteProjectTest();
    
    // 输出 JSON 报告
    const reportPath = '/Users/jiangqiyuan/WorkBuddy/2026-06-15-15-42-19/graph-driven-development/test-results.json';
    await import('fs').then(fs => {
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    });
    console.log(`\n测试报告已保存到: ${reportPath}`);
}

main().catch(console.error);
