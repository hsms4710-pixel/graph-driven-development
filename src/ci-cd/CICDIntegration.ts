/**
 * CI/CD Integration
 * 
 * 集成主流 CI/CD 平台，支持：
 * - GitHub Actions
 * - GitLab CI
 * - Jenkins
 * - CircleCI
 * - Travis CI
 */

// ==================== 类型定义 ====================

export type CIPlatform = 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci' | 'travis';

export interface CIConfig {
  platform: CIPlatform;
  version?: string;
  triggers: CITrigger[];
  jobs: CIJob[];
  secrets: CISecret[];
  notifications?: CINotification[];
}

export interface CITrigger {
  type: 'push' | 'pull_request' | 'schedule' | 'manual' | 'webhook';
  branches?: string[];
  paths?: string[];
  schedule?: string; // cron 表达式
}

export interface CIJob {
  id: string;
  name: string;
  runsOn: string[]; // runner 标签
  steps: CIStep[];
  env?: Record<string, string>;
  services?: string[];
  timeoutMinutes?: number;
  retries?: number;
  needs?: string[];
}

export interface CIStep {
  id?: string;
  name: string;
  uses?: string; // action/reusable
  run?: string; // shell command
  with?: Record<string, string>;
  env?: Record<string, string>;
  continueOnError?: boolean;
}

export interface CISecret {
  name: string;
  value?: string; // 不应该存储，仅用于验证
  description?: string;
}

export interface CINotification {
  type: 'email' | 'slack' | 'webhook' | 'teams';
  on: ('success' | 'failure' | 'always')[];
  config: Record<string, string>;
}

export interface PipelineStatus {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled';
  duration: number; // milliseconds
  startTime: Date;
  endTime?: Date;
  jobs: JobStatus[];
}

export interface JobStatus {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'skipped';
  steps: StepStatus[];
}

export interface StepStatus {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'skipped';
  duration: number;
  logs?: string;
}

// ==================== CI/CD Generator ====================

export class CICDGenerator {
  
  /**
   * 生成 GitHub Actions 配置
   */
  static generateGitHubActions(config: CIConfig): string {
    const yaml: Record<string, unknown> = {};
    
    // 触发器
    yaml['name'] = config.jobs[0]?.name || 'CI Pipeline';
    yaml['on'] = this.buildTriggers(config.triggers);
    
    // 密钥引用
    if (config.secrets.length > 0) {
      yaml['env'] = this.buildEnvFromSecrets(config.secrets);
    }
    
    // 通知
    if (config.notifications) {
      yaml['notifications'] = this.buildNotifications(config.notifications);
    }
    
    // 作业
    yaml['jobs'] = {};
    for (const job of config.jobs) {
      (yaml['jobs'] as Record<string, unknown>)![job.id] = this.buildJob(job);
    }
    
    return this.toYaml(yaml);
  }
  
  /**
   * 生成 GitLab CI 配置
   */
  static generateGitLabCI(config: CIConfig): string {
    const yaml: Record<string, unknown> = {};
    
    yaml['stages'] = config.jobs.map(j => j.name);
    
    // 触发器
    yaml['rules'] = this.buildGitLabRules(config.triggers);
    
    // 变量
    if (config.secrets.length > 0) {
      yaml['variables'] = {};
      for (const secret of config.secrets) {
        (yaml['variables'] as Record<string, string>)[secret.name] = 
          ` ${secret.name} `; // 占位符，实际值在 CI/CD 设置中
      }
    }
    
    // 作业
    yaml['include'] = [];
    yaml['.default'] = {
      tags: config.jobs[0]?.runsOn || ['docker'],
      retry: config.jobs[0]?.retries || 1,
    };
    
    for (const job of config.jobs) {
      yaml[job.id] = this.buildGitLabJob(job);
    }
    
    return this.toYaml(yaml);
  }
  
  /**
   * 生成 Jenkins Pipeline (Jenkinsfile)
   */
  static generateJenkinsfile(config: CIConfig, format: 'groovy' | 'declarative' = 'declarative'): string {
    if (format === 'declarative') {
      return this.generateJenkinsDeclarative(config);
    }
    return this.generateJenkinsGroovy(config);
  }
  
  private static generateJenkinsDeclarative(config: CIConfig): string {
    const lines: string[] = [
      'pipeline {',
      '    agent any',
      '',
      '    environment {',
    ];
    
    for (const secret of config.secrets) {
      lines.push(`        ${secret.name} = credentials(\"${secret.name}\")`);
    }
    lines.push('    }');
    lines.push('');
    
    // 触发器
    lines.push('    triggers {');
    for (const trigger of config.triggers) {
      if (trigger.type === 'schedule' && trigger.schedule) {
        lines.push(`        cron(\"${trigger.schedule}\")`);
      }
    }
    lines.push('    }');
    lines.push('');
    
    // 阶段
    lines.push('    stages {');
    for (const job of config.jobs) {
      lines.push(`        stage(\"${job.name}\") {`);
      lines.push('            steps {');
      for (const step of job.steps) {
        lines.push(`                ${this.generateJenkinsStep(step)}`);
      }
      lines.push('            }');
      lines.push('        }');
    }
    lines.push('    }');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private static generateJenkinsGroovy(config: CIConfig): string {
    const lines: string[] = [
      'def call(Map params = [:]) {',
      '',
      '    pipeline {',
      '        node {',
      '',
      '        stage(\"Initialize\") {',
      '            checkout scm',
      '        }',
      '',
      '        // Stages',
    ];
    
    for (const job of config.jobs) {
      lines.push(`        stage(\"${job.name}\") {`);
      lines.push('            steps {');
      for (const step of job.steps) {
        lines.push(`                ${this.generateJenkinsStep(step)}`);
      }
      lines.push('            }');
      lines.push('        }');
    }
    
    lines.push('        } // node');
    lines.push('    } // pipeline');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  // ==================== 辅助方法 ====================
  
  private static buildTriggers(triggers: CITrigger[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const trigger of triggers) {
      switch (trigger.type) {
        case 'push':
          result['push'] = trigger.branches ? { branches: trigger.branches } : 'branches: [\"main\", \"develop\"]';
          break;
        case 'pull_request':
          result['pull_request'] = trigger.branches ? { branches: trigger.branches } : true;
          break;
        case 'schedule':
          if (!result['schedule']) result['schedule'] = [];
          (result['schedule'] as any[]).push({ cron: trigger.schedule || '0 0 * * *' });
          break;
        case 'manual':
          result['workflow_dispatch'] = true;
          break;
      }
    }
    
    return Object.keys(result).length > 0 ? result : { push: 'branches: [\"main\"]', pull_request: true };
  }
  
  private static buildGitLabRules(triggers: CITrigger[]): unknown[] {
    const rules: Record<string, unknown>[] = [];
    
    for (const trigger of triggers) {
      const rule: Record<string, unknown> = {};
      
      switch (trigger.type) {
        case 'push':
          rule['if'] = '$CI_PIPELINE_SOURCE == "push"';
          if (trigger.branches) {
            rule['changes'] = trigger.branches.map(b => `/${b}/**`);
          }
          break;
        case 'pull_request':
          rule['if'] = '$CI_PIPELINE_SOURCE == "merge_request"';
          break;
        case 'schedule':
          rule['if'] = '$CI_PIPELINE_SOURCE == "schedule"';
          break;
      }
      
      rules.push(rule);
    }
    
    return rules.length > 0 ? rules : [{ if: '$CI_PIPELINE_SOURCE == "push"' }];
  }
  
  private static buildEnvFromSecrets(secrets: CISecret[]): Record<string, string> {
    const env: Record<string, string> = {};
    for (const secret of secrets) {
      env[secret.name] = `\${{ secrets.${secret.name} }}`;
    }
    return env;
  }
  
  private static buildNotifications(notifications: CINotification[]): Record<string, unknown> {
    const result: Record<string, unknown> = { default: 'none' };
    
    for (const notification of notifications) {
      switch (notification.type) {
        case 'email':
          result['email'] = {
            recipients: notification.config.to || '',
            send_on: notification.on,
          };
          break;
        case 'slack':
          result['slack'] = {
            channel: notification.config.channel || '#ci',
            send_on: notification.on,
          };
          break;
      }
    }
    
    return result;
  }
  
  private static buildJob(job: CIJob): Record<string, unknown> {
    const result: Record<string, unknown> = {
      runs_on: job.runsOn[0] || 'ubuntu-latest',
      steps: job.steps.map(step => this.buildStep(step)),
    };
    
    if (job.env) {
      result['env'] = job.env;
    }
    
    if (job.services) {
      result['services'] = job.services.map(s => ({ name: s }));
    }
    
    if (job.timeoutMinutes) {
      result['timeout_minutes'] = job.timeoutMinutes;
    }
    
    if (job.retries) {
      result['retry'] = job.retries;
    }
    
    if (job.needs) {
      result['needs'] = job.needs;
    }
    
    return result;
  }
  
  private static buildGitLabJob(job: CIJob): Record<string, unknown> {
    const result: Record<string, unknown> = {
      stage: job.name,
      script: job.steps.map(step => step.run || 'echo "step"'),
    };
    
    if (job.runsOn) {
      result['tags'] = job.runsOn;
    }
    
    if (job.env) {
      result['variables'] = job.env;
    }
    
    if (job.services) {
      result['services'] = job.services.map(s => ({ name: s }));
    }
    
    if (job.timeoutMinutes) {
      result['timeout'] = job.timeoutMinutes * 60 * 1000;
    }
    
    if (job.retries) {
      result['retry'] = job.retries;
    }
    
    if (job.needs) {
      result['dependencies'] = job.needs;
    }
    
    return result;
  }
  
  private static buildStep(step: CIStep): Record<string, unknown> {
    const result: Record<string, unknown> = { name: step.name };
    
    if (step.id) {
      result['id'] = step.id;
    }
    
    if (step.uses) {
      result['uses'] = step.uses;
      if (step.with) {
        result['with'] = step.with;
      }
    }
    
    if (step.run) {
      result['run'] = step.run;
    }
    
    if (step.env) {
      result['env'] = step.env;
    }
    
    if (step.continueOnError) {
      result['continue_on_error'] = step.continueOnError;
    }
    
    return result;
  }
  
  private static generateJenkinsStep(step: CIStep): string {
    if (step.uses) {
      return `                sh \"\"\"\n${step.run || ''}\n                \"\"\"`;
    }
    return `                sh \"${step.run || 'echo step'}\"`;
  }
  
  private static toYaml(obj: unknown, indent = 0): string {
    const lines: string[] = [];
    const prefix = '  '.repeat(indent);
    
    if (obj === null || obj === undefined) return '';
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${prefix}- ${this.toYaml(item, indent + 1)}`);
        } else {
          lines.push(`${prefix}- ${item}`);
        }
      }
      return lines.join('\n');
    }
    
    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          lines.push(`${prefix}${key}:`);
          lines.push(this.toYaml(value, indent));
        } else if (typeof value === 'object' && value !== null) {
          lines.push(`${prefix}${key}:`);
          lines.push(this.toYaml(value, indent + 1));
        } else {
          lines.push(`${prefix}${key}: ${value}`);
        }
      }
      return lines.join('\n');
    }
    
    return String(obj);
  }
}

// ==================== 预定义模板 ====================

export const CIPresets = {
  
  /** Node.js 项目 CI */
  nodejs: (projectName: string): CIConfig => ({
    platform: 'github-actions',
    triggers: [
      { type: 'push', branches: ['main', 'develop'] },
      { type: 'pull_request' },
    ],
    secrets: [
      { name: 'NPM_TOKEN', description: 'npm registry token' },
    ],
    jobs: [
      {
        id: 'test',
        name: 'Test',
        runsOn: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
        steps: [
          { name: 'Checkout', uses: 'actions/checkout@v4' },
          { name: 'Setup Node.js', uses: 'actions/setup-node@v4', with: { 'node-version': '20', 'cache': 'npm' } },
          { name: 'Install dependencies', run: 'npm ci' },
          { name: 'Run tests', run: 'npm test' },
          { name: 'Lint', run: 'npm run lint' },
        ],
      },
      {
        id: 'build',
        name: 'Build',
        runsOn: ['ubuntu-latest'],
        needs: ['test'],
        steps: [
          { name: 'Checkout', uses: 'actions/checkout@v4' },
          { name: 'Setup Node.js', uses: 'actions/setup-node@v4', with: { 'node-version': '20', 'cache': 'npm' } },
          { name: 'Build', run: 'npm run build' },
        ],
      },
    ],
  }),
  
  /** Python 项目 CI */
  python: (projectName: string): CIConfig => ({
    platform: 'github-actions',
    triggers: [
      { type: 'push', branches: ['main', 'develop'] },
      { type: 'pull_request' },
    ],
    secrets: [],
    jobs: [
      {
        id: 'test',
        name: 'Test',
        runsOn: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
        steps: [
          { name: 'Checkout', uses: 'actions/checkout@v4' },
          { name: 'Setup Python', uses: 'actions/setup-python@v5', with: { 'python-version': '3.11' } },
          { name: 'Install dependencies', run: 'pip install -r requirements.txt' },
          { name: 'Run tests', run: 'pytest' },
          { name: 'Lint', run: 'ruff check .' },
        ],
      },
    ],
  }),
  
  /** React 项目 CI */
  react: (projectName: string): CIConfig => ({
    platform: 'github-actions',
    triggers: [
      { type: 'push', branches: ['main', 'develop'] },
      { type: 'pull_request' },
    ],
    secrets: [
      { name: 'VITE_API_KEY', description: 'API key for production' },
    ],
    jobs: [
      {
        id: 'test',
        name: 'Test',
        runsOn: ['ubuntu-latest'],
        steps: [
          { name: 'Checkout', uses: 'actions/checkout@v4' },
          { name: 'Setup Node.js', uses: 'actions/setup-node@v4', with: { 'node-version': '20' } },
          { name: 'Install dependencies', run: 'npm ci' },
          { name: 'Run tests', run: 'npm test' },
        ],
      },
      {
        id: 'build',
        name: 'Build',
        runsOn: ['ubuntu-latest'],
        needs: ['test'],
        steps: [
          { name: 'Checkout', uses: 'actions/checkout@v4' },
          { name: 'Setup Node.js', uses: 'actions/setup-node@v4', with: { 'node-version': '20' } },
          { name: 'Build', run: 'npm run build' },
          { name: 'Upload artifacts', uses: 'actions/upload-artifact@v4', with: { 'name': 'dist', 'path': 'dist/' } },
        ],
      },
      {
        id: 'deploy',
        name: 'Deploy',
        runsOn: ['ubuntu-latest'],
        needs: ['build'],
        steps: [
          { name: 'Download artifacts', uses: 'actions/download-artifact@v4', with: { 'name': 'dist' } },
          { name: 'Deploy to production', run: 'npm run deploy' },
        ],
      },
    ],
  }),
  
  /** FastAPI 项目 CI */
  fastapi: (projectName: string): CIConfig => ({
    platform: 'github-actions',
    triggers: [
      { type: 'push', branches: ['main', 'develop'] },
      { type: 'pull_request' },
    ],
    secrets: [
      { name: 'DOCKER_USERNAME', description: 'Docker Hub username' },
      { name: 'DOCKER_PASSWORD', description: 'Docker Hub password' },
    ],
    jobs: [
      {
        id: 'lint',
        name: 'Lint',
        runsOn: ['ubuntu-latest'],
        steps: [
          { name: 'Checkout', uses: 'actions/checkout@v4' },
          { name: 'Setup Python', uses: 'actions/setup-python@v5', with: { 'python-version': '3.11' } },
          { name: 'Install ruff', run: 'pip install ruff' },
          { name: 'Lint', run: 'ruff check .' },
        ],
      },
      {
        id: 'test',
        name: 'Test',
        runsOn: ['ubuntu-latest'],
        steps: [
          { name: 'Checkout', uses: 'actions/checkout@v4' },
          { name: 'Setup Python', uses: 'actions/setup-python@v5', with: { 'python-version': '3.11' } },
          { name: 'Install dependencies', run: 'pip install -e ".[dev]"' },
          { name: 'Run tests', run: 'pytest' },
          { name: 'Generate coverage', run: 'pytest --cov=app --cov-report=xml' },
          { name: 'Upload coverage', uses: 'codecov/codecov-action@v4' },
        ],
      },
      {
        id: 'docker',
        name: 'Build Docker',
        runsOn: ['ubuntu-latest'],
        needs: ['test'],
        steps: [
          { name: 'Checkout', uses: 'actions/checkout@v4' },
          { name: 'Login to Docker Hub', uses: 'docker/login-action@v3', with: { username: '\${{ secrets.DOCKER_USERNAME }}', password: '\${{ secrets.DOCKER_PASSWORD }}' } },
          { name: 'Build and push Docker image', uses: 'docker/build-push-action@v5', with: {
            context: '.',
            push: 'true',
            tags: '\${{ secrets.DOCKER_USERNAME }}/${projectName}:\${{ github.sha }}',
          } },
        ],
      },
    ],
  }),
};
