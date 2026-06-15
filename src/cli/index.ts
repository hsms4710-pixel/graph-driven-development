#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CodeIndexer, type IndexOptions } from '../indexer';
import { GraphSerializer } from '../core/serializer';
import { CodeGenerator, type GenerationOptions } from '../generator';

const program = new Command();

program
  .name('gdd')
  .description('Graph-Driven Development Tool')
  .version('0.1.0');

// index 命令
program
  .command('index')
  .description('索引代码库，生成架构图')
  .argument('<path>', '代码库路径')
  .option('-o, --output <file>', '输出文件路径', 'graph.json')
  .option('-v, --verbose', '显示详细信息', false)
  .action(async (path: string, options) => {
    const spinner = ora('正在索引代码库...').start();
    
    try {
      const indexer = new CodeIndexer();
      const result = await indexer.indexDirectory(path, {
        verbose: options.verbose
      });
      
      spinner.succeed(chalk.green(`索引完成！`));
      
      console.log();
      console.log(chalk.bold('统计信息:'));
      console.log(`  - 文件数: ${chalk.blue(result.filesIndexed)}`);
      console.log(`  - 节点数: ${chalk.blue(result.nodesCreated)}`);
      console.log(`  - 边数: ${chalk.blue(result.edgesCreated)}`);
      console.log(`  - 耗时: ${chalk.blue((result.duration / 1000).toFixed(2))}s`);
      
      // 保存图
      const json = GraphSerializer.toJSON(result.graph);
      fs.writeFileSync(options.output, json);
      console.log();
      console.log(chalk.gray(`图已保存到: ${options.output}`));
      
    } catch (error: any) {
      spinner.fail(chalk.red('索引失败'));
      console.error(error.message);
      process.exit(1);
    }
  });

// open 命令
program
  .command('open')
  .description('打开可视化编辑器')
  .option('-g, --graph <file>', '加载已有的图文件')
  .action((options) => {
    console.log(chalk.yellow('启动可视化编辑器...'));
    console.log(chalk.gray('运行 npm run dev 启动开发服务器'));
    
    if (options.graph) {
      try {
        const json = fs.readFileSync(options.graph, 'utf-8');
        const graph = GraphSerializer.fromJSON(json);
        console.log(chalk.green(`已加载图: ${graph.name}`));
      } catch (error) {
        console.error(chalk.red('加载图文件失败'));
      }
    }
  });

// generate 命令
program
  .command('generate')
  .description('从图生成代码')
  .argument('<graph>', '图文件路径')
  .option('-o, --output <dir>', '输出目录', './output')
  .option('-p, --parallel', '并行生成', true)
  .option('-v, --verbose', '显示详细信息', false)
  .action(async (graphPath: string, options) => {
    const spinner = ora('正在加载图...').start();
    
    try {
      // 加载图
      const json = fs.readFileSync(graphPath, 'utf-8');
      const graph = GraphSerializer.fromJSON(json);
      
      spinner.text = '正在生成代码...';
      
      // 生成代码
      const generator = new CodeGenerator();
      const result = await generator.generate(graph, {
        outputDir: options.output,
        parallel: options.parallel,
        verbose: options.verbose
      });
      
      if (result.success) {
        spinner.succeed(chalk.green('代码生成完成！'));
        
        console.log();
        console.log(chalk.bold('生成结果:'));
        console.log(`  - 生成文件数: ${chalk.blue(result.files.length)}`);
        console.log(`  - 耗时: ${chalk.blue((result.duration / 1000).toFixed(2))}s`);
        
        if (result.files.length > 0) {
          console.log();
          console.log(chalk.bold('生成的文件:'));
          result.files.slice(0, 10).forEach(file => {
            console.log(chalk.gray(`  - ${file.path}`));
          });
          if (result.files.length > 10) {
            console.log(chalk.gray(`  ... 还有 ${result.files.length - 10} 个文件`));
          }
        }
      } else {
        spinner.fail(chalk.red('代码生成失败'));
        
        if (result.errors.length > 0) {
          console.log();
          console.log(chalk.bold.red('错误:'));
          result.errors.slice(0, 5).forEach(err => {
            console.log(chalk.red(`  - ${err.nodeId}: ${err.message}`));
          });
        }
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red('生成失败'));
      console.error(error.message);
      process.exit(1);
    }
  });

// analyze 命令
program
  .command('analyze')
  .description('分析图的影响关系')
  .argument('<graph>', '图文件路径')
  .argument('<node>', '节点 ID 或标签')
  .option('-d, --direction <dir>', '分析方向: upstream, downstream, both', 'both')
  .action(async (graphPath: string, nodeId: string, options) => {
    try {
      const json = fs.readFileSync(graphPath, 'utf-8');
      const graph = GraphSerializer.fromJSON(json);
      
      // 查找节点
      let targetNode = graph.getNode(nodeId);
      if (!targetNode) {
        // 尝试按标签查找
        const nodes = graph.getNodes().filter(n => n.label === nodeId);
        if (nodes.length > 0) {
          targetNode = nodes[0];
        }
      }
      
      if (!targetNode) {
        console.error(chalk.red(`未找到节点: ${nodeId}`));
        process.exit(1);
      }
      
      console.log(chalk.bold.blue(`分析节点: ${targetNode.label}`));
      console.log();
      
      if (options.direction === 'upstream' || options.direction === 'both') {
        const dependents = graph.getDependents(targetNode.id);
        console.log(chalk.bold('依赖此节点的模块:'));
        if (dependents.length === 0) {
          console.log(chalk.gray('  (无)'));
        } else {
          dependents.forEach(n => console.log(`  - ${n.label}`));
        }
        console.log();
      }
      
      if (options.direction === 'downstream' || options.direction === 'both') {
        const dependencies = graph.getDependencies(targetNode.id);
        console.log(chalk.bold('此节点依赖的模块:'));
        if (dependencies.length === 0) {
          console.log(chalk.gray('  (无)'));
        } else {
          dependencies.forEach(n => console.log(`  - ${n.label}`));
        }
        console.log();
      }
      
    } catch (error: any) {
      console.error(chalk.red('分析失败'));
      console.error(error.message);
      process.exit(1);
    }
  });

// 帮助信息
program.addHelpText('after', `

${chalk.bold('示例:')}
  $ gdd index ./my-project              索引代码库
  $ gdd open                            打开可视化编辑器
  $ gdd generate graph.json -o ./src    从图生成代码
  $ gdd analyze graph.json Auth         分析 Auth 节点的影响

${chalk.bold('更多信息:')}
  访问 ${chalk.underline.blue('https://github.com/hsms4710-pixel/graph-driven-development')}
`);

// 解析命令行参数
program.parse(process.argv);
