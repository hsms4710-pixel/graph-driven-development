/**
 * Graph-Driven Development - Framework Analyzer
 * 
 * 框架特定分析：
 * - Flask: 路由、蓝图、中间件
 * - Django: 模型、视图、URL、序列化器
 * - FastAPI: 路径操作、依赖注入、Pydantic 模型
 * - pytest: 测试用例、夹具、参数化
 * - Typer/Rich: CLI 命令、终端输出
 */

import { PythonFileAnalysis, FrameworkHint } from './PythonEnhancer';

// ==================== 类型定义 ====================

export interface FrameworkType {
  name: string;
  version?: string;
  confidence: number;
  category: 'web' | 'cli' | 'testing' | 'database' | 'task' | 'utility';
  features: FrameworkFeature[];
}

export interface FrameworkFeature {
  name: string;
  type: 'route' | 'model' | 'view' | 'serializer' | 'middleware' | 'task' | 'fixture' | 'command' | 'config';
  filePath: string;
  line: number;
  indicator: string;
  metadata?: Record<string, unknown>;
}

export interface ProjectFrameworks {
  main: FrameworkType | null;
  frameworks: FrameworkType[];
  features: FrameworkFeature[];
}

// ==================== 框架模式定义 ====================

const FRAMEWORK_PATTERNS: Record<string, {
  imports: string[];
  decorators: string[];
  files: string[];
  category: FrameworkType['category'];
  description: string;
}> = {
  fastapi: {
    imports: ['fastapi', 'pydantic', 'uvicorn'],
    decorators: ['@app.get', '@app.post', '@app.put', '@app.delete', '@router', '@api_route', '@Depends'],
    files: ['main.py', 'app.py', 'api.py'],
    category: 'web',
    description: 'FastAPI - 现代、快速的 Web 框架'
  },
  django: {
    imports: ['django', 'rest_framework', 'django.db', 'models'],
    decorators: ['@api_view', '@action', '@permission_classes', '@csrf_exempt'],
    files: ['views.py', 'models.py', 'urls.py', 'serializers.py', 'settings.py'],
    category: 'web',
    description: 'Django - 全功能 Web 框架'
  },
  flask: {
    imports: ['flask', 'werkzeug', 'flask_restful', 'flask_sqlalchemy'],
    decorators: ['@app.route', '@blueprint.route', '@login_required'],
    files: ['app.py', 'routes.py', 'models.py'],
    category: 'web',
    description: 'Flask - 轻量级 Web 框架'
  },
  celery: {
    imports: ['celery', 'celery.task'],
    decorators: ['@task', '@shared_task'],
    files: ['tasks.py', 'celery.py'],
    category: 'task',
    description: 'Celery - 分布式任务队列'
  },
  sqlalchemy: {
    imports: ['sqlalchemy', 'SQLAlchemy', 'declarative_base'],
    decorators: [],
    files: ['models.py', 'database.py'],
    category: 'database',
    description: 'SQLAlchemy - ORM 库'
  },
  pytest: {
    imports: ['pytest', 'pytest_asyncio', 'pytest_mock', 'pytest.fixture'],
    decorators: ['@pytest.fixture', '@pytest.mark', '@pytest_asyncio.fixture'],
    files: ['test_*.py', 'conftest.py', 'pytest.ini', 'pyproject.toml'],
    category: 'testing',
    description: 'pytest - 测试框架'
  },
  typer: {
    imports: ['typer', 'click'],
    decorators: ['@app.command', '@click.command', '@app.callback'],
    files: ['main.py', 'cli.py', '__init__.py'],
    category: 'cli',
    description: 'Typer - CLI 框架'
  },
  rich: {
    imports: ['rich', 'rich.console', 'rich.table', 'rich.panel', 'rich.progress'],
    decorators: [],
    files: ['cli.py', 'ui.py', 'display.py'],
    category: 'utility',
    description: 'Rich - 终端美化库'
  },
  alembic: {
    imports: ['alembic', 'migrate'],
    decorators: [],
    files: ['alembic/', 'migrations/'],
    category: 'database',
    description: 'Alembic - 数据库迁移工具'
  }
};

// ==================== Framework Analyzer ====================

export class FrameworkAnalyzer {
  
  /**
   * 分析项目使用的框架
   */
  analyze(files: PythonFileAnalysis[]): ProjectFrameworks {
    const frameworkScores = this.scoreFrameworks(files);
    const frameworks = this.rankFrameworks(frameworkScores);
    const features = this.extractFeatures(files, frameworks);
    
    return {
      main: frameworks[0] || null,
      frameworks,
      features
    };
  }
  
  /**
   * 计算框架得分
   */
  private scoreFrameworks(files: PythonFileAnalysis[]): Map<string, {
    importScore: number;
    decoratorScore: number;
    fileScore: number;
    totalScore: number;
    indicators: FrameworkHint[];
  }> {
    const scores = new Map<string, {
      importScore: number;
      decoratorScore: number;
      fileScore: number;
      totalScore: number;
      indicators: FrameworkHint[];
    }>();
    
    // 初始化所有框架
    for (const framework of Object.keys(FRAMEWORK_PATTERNS)) {
      scores.set(framework, {
        importScore: 0,
        decoratorScore: 0,
        fileScore: 0,
        totalScore: 0,
        indicators: []
      });
    }
    
    // 分析文件
    for (const file of files) {
      // 检查文件名匹配
      for (const [framework, pattern] of Object.entries(FRAMEWORK_PATTERNS)) {
        for (const fileName of pattern.files) {
          if (file.path.includes(fileName) || new RegExp(fileName.replace(/\*/g, '.*')).test(file.path)) {
            const score = scores.get(framework)!;
            score.fileScore += 1.5;
            score.indicators.push({
              framework,
              indicator: `文件 ${file.path} 匹配框架模式`,
              confidence: 0.7,
              line: 0
            });
          }
        }
      }
      
      // 检查导入
      for (const imp of file.imports) {
        for (const [framework, pattern] of Object.entries(FRAMEWORK_PATTERNS)) {
          const normalizedModule = imp.module.toLowerCase();
          for (const importPattern of pattern.imports) {
            if (normalizedModule.includes(importPattern.toLowerCase())) {
              const score = scores.get(framework)!;
              score.importScore += 2;
              score.indicators.push({
                framework,
                indicator: `导入 ${imp.module}`,
                confidence: 0.9,
                line: 0
              });
            }
          }
        }
      }
      
      // 检查装饰器
      for (const hint of file.frameworkHints) {
        const score = scores.get(hint.framework)!;
        score.decoratorScore += hint.confidence * 3;
        score.indicators.push(hint);
      }
    }
    
    // 计算总分
    for (const [framework, score] of scores) {
      // 归一化得分 (0-100)
      score.totalScore = Math.min(100, (
        score.importScore * 0.4 +
        score.decoratorScore * 0.5 +
        score.fileScore * 0.1
      ));
    }
    
    return scores;
  }
  
  /**
   * 排序框架
   */
  private rankFrameworks(scores: Map<string, {
    importScore: number;
    decoratorScore: number;
    fileScore: number;
    totalScore: number;
    indicators: FrameworkHint[];
  }>): FrameworkType[] {
    const frameworks: FrameworkType[] = [];
    
    for (const [name, score] of scores) {
      if (score.totalScore < 10) continue; // 过滤低分框架
      
      const pattern = FRAMEWORK_PATTERNS[name];
      const features = this.extractFrameworkFeatures(name, score.indicators);
      
      frameworks.push({
        name,
        confidence: score.totalScore / 100,
        category: pattern.category,
        features
      });
    }
    
    // 按得分排序
    frameworks.sort((a, b) => b.confidence - a.confidence);
    
    return frameworks;
  }
  
  /**
   * 提取框架特征
   */
  private extractFrameworkFeatures(framework: string, indicators: FrameworkHint[]): FrameworkFeature[] {
    const features: FrameworkFeature[] = [];
    
    for (const indicator of indicators) {
      // FastAPI 特征
      if (framework === 'fastapi') {
        if (indicator.indicator.includes('@app.get') || indicator.indicator.includes('@router')) {
          features.push({
            name: 'API 路由',
            type: 'route',
            filePath: '', // 将在文件级别填充
            line: indicator.line,
            indicator: indicator.indicator,
            metadata: { method: 'GET' }
          });
        }
        if (indicator.indicator.includes('@Depends')) {
          features.push({
            name: '依赖注入',
            type: 'config',
            filePath: '',
            line: indicator.line,
            indicator: indicator.indicator
          });
        }
      }
      
      // Flask 特征
      if (framework === 'flask') {
        if (indicator.indicator.includes('@app.route')) {
          features.push({
            name: '路由',
            type: 'route',
            filePath: '',
            line: indicator.line,
            indicator: indicator.indicator
          });
        }
        if (indicator.indicator.includes('@login_required')) {
          features.push({
            name: '认证保护',
            type: 'middleware',
            filePath: '',
            line: indicator.line,
            indicator: indicator.indicator
          });
        }
      }
      
      // Django 特征
      if (framework === 'django') {
        if (indicator.indicator.includes('@api_view')) {
          features.push({
            name: 'API 视图',
            type: 'view',
            filePath: '',
            line: indicator.line,
            indicator: indicator.indicator
          });
        }
        if (indicator.indicator.includes('@action')) {
          features.push({
            name: '视图集操作',
            type: 'view',
            filePath: '',
            line: indicator.line,
            indicator: indicator.indicator
          });
        }
        if (indicator.indicator.includes('models')) {
          features.push({
            name: '数据模型',
            type: 'model',
            filePath: '',
            line: indicator.line,
            indicator: indicator.indicator
          });
        }
      }
      
      // Celery 特征
      if (framework === 'celery') {
        if (indicator.indicator.includes('@task')) {
          features.push({
            name: '异步任务',
            type: 'task',
            filePath: '',
            line: indicator.line,
            indicator: indicator.indicator
          });
        }
      }
      
      // pytest 特征
      if (framework === 'pytest') {
        if (indicator.indicator.includes('@pytest.fixture')) {
          features.push({
            name: '测试夹具',
            type: 'fixture',
            filePath: '',
            line: indicator.line,
            indicator: indicator.indicator
          });
        }
        if (indicator.indicator.includes('@pytest.mark')) {
          features.push({
            name: '测试标记',
            type: 'config',
            filePath: '',
            line: indicator.line,
            indicator: indicator.indicator
          });
        }
      }
      
      // Typer 特征
      if (framework === 'typer') {
        if (indicator.indicator.includes('@app.command') || indicator.indicator.includes('@click.command')) {
          features.push({
            name: 'CLI 命令',
            type: 'command',
            filePath: '',
            line: indicator.line,
            indicator: indicator.indicator
          });
        }
      }
    }
    
    return features;
  }
  
  /**
   * 提取所有框架特征（带文件路径）
   */
  private extractFeatures(files: PythonFileAnalysis[], frameworks: FrameworkType[]): FrameworkFeature[] {
    const allFeatures: FrameworkFeature[] = [];
    
    for (const file of files) {
      for (const hint of file.frameworkHints) {
        const framework = frameworks.find(f => f.name === hint.framework);
        if (!framework) continue;
        
        allFeatures.push({
          name: this.getFeatureName(hint.indicator, hint.framework),
          type: this.getFeatureType(hint.indicator, hint.framework),
          filePath: file.path,
          line: hint.line,
          indicator: hint.indicator
        });
      }
    }
    
    return allFeatures;
  }
  
  /**
   * 获取特征名称
   */
  private getFeatureName(indicator: string, framework: string): string {
    if (indicator.includes('@app.get') || indicator.includes('@router.get')) {
      return 'GET 路由';
    }
    if (indicator.includes('@app.post') || indicator.includes('@router.post')) {
      return 'POST 路由';
    }
    if (indicator.includes('@app.put') || indicator.includes('@router.put')) {
      return 'PUT 路由';
    }
    if (indicator.includes('@app.delete') || indicator.includes('@router.delete')) {
      return 'DELETE 路由';
    }
    if (indicator.includes('@app.route')) {
      return 'Flask 路由';
    }
    if (indicator.includes('@task') || indicator.includes('@shared_task')) {
      return '异步任务';
    }
    if (indicator.includes('@pytest.fixture')) {
      return '测试夹具';
    }
    if (indicator.includes('@app.command') || indicator.includes('@click.command')) {
      return 'CLI 命令';
    }
    
    return '框架使用';
  }
  
  /**
   * 获取特征类型
   */
  private getFeatureType(indicator: string, framework: string): FrameworkFeature['type'] {
    if (indicator.includes('@app.') || indicator.includes('@router') || indicator.includes('@api_view')) {
      return 'route';
    }
    if (indicator.includes('@task') || indicator.includes('@shared_task')) {
      return 'task';
    }
    if (indicator.includes('@pytest.fixture')) {
      return 'fixture';
    }
    if (indicator.includes('@app.command') || indicator.includes('@click.command')) {
      return 'command';
    }
    
    return 'config';
  }
}

// ==================== 导出 ====================

export default FrameworkAnalyzer;
