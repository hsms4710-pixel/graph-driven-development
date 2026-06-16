/**
 * Code Indexer 测试
 */

import { CodeIndexer } from '../src/indexer/CodeIndexer';

async function main() {
    // 使用当前项目作为测试
    const projectPath = '/Users/jiangqiyuan/WorkBuddy/2026-06-15-15-42-19/graph-driven-development/src';
    const graphId = 'test-graph-' + Date.now();
    
    console.log('Testing CodeIndexer on:', projectPath);
    console.log('Graph ID:', graphId);
    
    const indexer = new CodeIndexer(graphId, projectPath);
    const result = await indexer.index();
    
    console.log('\n=== Index Summary ===');
    console.log('Files scanned:', result.summary.filesScanned);
    console.log('Nodes generated:', result.summary.nodesGenerated);
    console.log('Edges generated:', result.summary.edgesGenerated);
    console.log('\nLayer distribution:');
    for (const [layer, count] of Object.entries(result.summary.layers)) {
        console.log(`  ${layer}: ${count}`);
    }
    
    console.log('\n=== Sample Nodes ===');
    result.nodes.slice(0, 10).forEach(node => {
        console.log(`  [${node.layer}] ${node.label} (${node.type})`);
        if (node.filePath) {
            console.log(`    -> ${node.filePath}`);
        }
    });
    
    console.log('\n=== Sample Edges ===');
    result.edges.slice(0, 10).forEach(edge => {
        console.log(`  ${edge.source} --${edge.type}--> ${edge.target}`);
    });
    
    if (result.summary.errors.length > 0) {
        console.log('\n=== Errors ===');
        result.summary.errors.forEach(e => console.log('  -', e));
    }
}

main().catch(console.error);
