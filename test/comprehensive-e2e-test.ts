/**
 * GDD 综合端到端测试
 */

import { graphStore } from '../src/mcp/GraphStore';
import { NodeTemplateManager } from '../src/mcp/NodeTemplateManager';
import { BrainstormEngine } from '../src/brainstorm/BrainstormEngine';

const L1 = 'L1_Constitution';
const L2 = 'L2_TechStack';
const L3 = 'L3_Epic';
const L4 = 'L4_Story';
const L5 = 'L5_Task';

const EdgeType = {
  DependsOn: 'depends_on',
  Implements: 'implements',
  Contains: 'contains'
};

const results = [];

function test(name, fn) {
  const start = Date.now();
  try {
    fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log('OK', name);
  } catch (e) {
    results.push({ name, passed: false, duration: Date.now() - start, error: e.message });
    console.log('FAIL', name, ':', e.message);
  }
}

function expect(value) {
  return {
    toBe: (v) => { if (value !== v) throw new Error('Expected ' + value + ' to be ' + v); },
    toEqual: (v) => { if (JSON.stringify(value) !== JSON.stringify(v)) throw new Error('Expected ' + JSON.stringify(value) + ' to equal ' + JSON.stringify(v)); },
    toBeDefined: () => { if (value === undefined) throw new Error('Expected value to be defined'); },
    toBeGreaterThan: (v) => { if (value <= v) throw new Error('Expected ' + value + ' to be > ' + v); },
    toBeGreaterThanOrEqual: (v) => { if (value < v) throw new Error('Expected ' + value + ' to be >= ' + v); },
    toContain: (v) => { if (!Array.isArray(value) || !(value).includes(v)) throw new Error('Expected to contain ' + v); },
    get length() { return (value).length; }
  };
}

const TEST_GRAPH_ID = 'graph_e2e_test';

// Initialize
graphStore.createGraph({
  name: 'E2E Test Project',
  description: 'Test project',
  id: TEST_GRAPH_ID
});

console.log('\n=== 1. Graph Data Structure ===');

test('Create L1 node', () => {
  graphStore.addNode(TEST_GRAPH_ID, {
    id: 'l1', label: 'Constitution', type: 'constitution', layer: L1, layerLabel: 'L1', properties: {}
  });
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  expect(g.nodes.some(n => n.id === 'l1')).toBe(true);
});

test('Create L2 node', () => {
  graphStore.addNode(TEST_GRAPH_ID, {
    id: 'l2', label: 'Tech', type: 'tech', layer: L2, layerLabel: 'L2', properties: {}
  });
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  expect(g.nodes.some(n => n.id === 'l2')).toBe(true);
});

test('Create L3 node', () => {
  graphStore.addNode(TEST_GRAPH_ID, {
    id: 'l3', label: 'Epic', type: 'epic', layer: L3, layerLabel: 'L3', properties: {}
  });
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  expect(g.nodes.some(n => n.id === 'l3')).toBe(true);
});

test('Create L4 node', () => {
  graphStore.addNode(TEST_GRAPH_ID, {
    id: 'l4', label: 'Story', type: 'story', layer: L4, layerLabel: 'L4', properties: {}
  });
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  expect(g.nodes.some(n => n.id === 'l4')).toBe(true);
});

test('Create L5 node', () => {
  graphStore.addNode(TEST_GRAPH_ID, {
    id: 'l5', label: 'Task', type: 'task', layer: L5, layerLabel: 'L5', properties: {}
  });
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  expect(g.nodes.some(n => n.id === 'l5')).toBe(true);
});

test('Create edges between layers', () => {
  graphStore.addEdge(TEST_GRAPH_ID, { from: 'l1', to: 'l2', type: EdgeType.DependsOn });
  graphStore.addEdge(TEST_GRAPH_ID, { from: 'l2', to: 'l3', type: EdgeType.DependsOn });
  graphStore.addEdge(TEST_GRAPH_ID, { from: 'l3', to: 'l4', type: EdgeType.DependsOn });
  graphStore.addEdge(TEST_GRAPH_ID, { from: 'l4', to: 'l5', type: EdgeType.DependsOn });
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  expect(g.edges.length).toBe(4);
});

test('Verify 5 layers exist', () => {
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const layers = new Set(g.nodes.map(n => n.layer));
  expect(layers.has(L1)).toBe(true);
  expect(layers.has(L2)).toBe(true);
  expect(layers.has(L3)).toBe(true);
  expect(layers.has(L4)).toBe(true);
  expect(layers.has(L5)).toBe(true);
});

console.log('\n=== 2. Graph Query ===');

test('Query L3 nodes', () => {
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const nodes = g.nodes.filter(n => n.layer === L3);
  expect(nodes.length).toBe(1);
  expect(nodes[0].label).toBe('Epic');
});

test('Query incoming edges', () => {
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const incoming = g.edges.filter(e => e.to === 'l5');
  expect(incoming.length).toBe(1);
  expect(incoming[0].from).toBe('l4');
});

test('Query outgoing edges', () => {
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const outgoing = g.edges.filter(e => e.from === 'l3');
  expect(outgoing.length).toBe(1);
  expect(outgoing[0].to).toBe('l4');
});

console.log('\n=== 3. Node Templates ===');

// Check if templates are available
let templatesAvailable = false;
try {
  const { L1_Constitution_Templates } = NodeTemplateManager;
  if (L1_Constitution_Templates && L1_Constitution_Templates.length > 0) {
    templatesAvailable = true;
  }
} catch (e) {}

test('Node templates module exists', () => {
  expect(NodeTemplateManager).toBeDefined();
});

test('Node templates module is valid', () => {
  // NodeTemplateManager can be a function or class
  const t = typeof NodeTemplateManager;
  expect(t === 'function' || t === 'object').toBe(true);
});

console.log('\n=== 4. Brainstorm Engine ===');

test('Start session', () => {
  const engine = new BrainstormEngine();
  const session = engine.startSession('Create a React app', TEST_GRAPH_ID);
  expect(session).toBeDefined();
  expect(session.sessionId).toBeDefined();
});

test('Get session', () => {
  const engine = new BrainstormEngine();
  const session = engine.startSession('test', TEST_GRAPH_ID);
  const retrieved = engine.getSession(session.sessionId);
  expect(retrieved.sessionId).toBe(session.sessionId);
});

test('Generate questions', () => {
  const engine = new BrainstormEngine();
  const session = engine.startSession('Create a web app', TEST_GRAPH_ID);
  expect(session.questions.length).toBeGreaterThan(0);
  expect(session.questions[0].id).toBeDefined();
  expect(session.questions[0].question).toBeDefined();
});

test('Answer question', () => {
  const engine = new BrainstormEngine();
  const session = engine.startSession('test', TEST_GRAPH_ID);
  if (session.questions.length > 0) {
    const q = session.questions[0];
    const answer = engine.answerQuestion(session.sessionId, q.id, [q.options[0].id]);
    expect(answer).toBeDefined();
  }
});

console.log('\n=== 5. MCP Sync ===');

test('MCP - Create node', () => {
  const id = 'mcp_' + Date.now();
  graphStore.addNode(TEST_GRAPH_ID, { id, label: 'MCP Node', type: 'f', layer: L4, layerLabel: 'L4' });
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  expect(g.nodes.some(n => n.id === id)).toBe(true);
});

test('MCP - Update node', () => {
  const id = 'mcp_upd_' + Date.now();
  graphStore.addNode(TEST_GRAPH_ID, { id, label: 'Original', type: 'f', layer: L4, layerLabel: 'L4' });
  graphStore.updateNode(TEST_GRAPH_ID, id, { label: 'Updated' });
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const n = g.nodes.find(x => x.id === id);
  expect(n.label).toBe('Updated');
});

test('MCP - Delete node', () => {
  const id = 'mcp_del_' + Date.now();
  graphStore.addNode(TEST_GRAPH_ID, { id, label: 'Delete', type: 'f', layer: L5, layerLabel: 'L5' });
  const r = graphStore.deleteNode(TEST_GRAPH_ID, id);
  expect(r.deleted).toBe(true);
});

test('MCP - Create edge', () => {
  const fromId = 'mcp_e1_' + Date.now();
  const toId = 'mcp_e2_' + Date.now();
  graphStore.addNode(TEST_GRAPH_ID, { id: fromId, label: 'Source', type: 'f', layer: L3, layerLabel: 'L3' });
  graphStore.addNode(TEST_GRAPH_ID, { id: toId, label: 'Target', type: 'f', layer: L4, layerLabel: 'L4' });
  graphStore.addEdge(TEST_GRAPH_ID, { from: fromId, to: toId, type: EdgeType.DependsOn });
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const e = g.edges.find(x => x.from === fromId && x.to === toId);
  expect(e.from).toBe(fromId);
  expect(e.to).toBe(toId);
});

test('MCP - Delete edge', () => {
  const fromId = 'mcp_ed1_' + Date.now();
  const toId = 'mcp_ed2_' + Date.now();
  graphStore.addNode(TEST_GRAPH_ID, { id: fromId, label: 'S', type: 'f', layer: L3, layerLabel: 'L3' });
  graphStore.addNode(TEST_GRAPH_ID, { id: toId, label: 'T', type: 'f', layer: L4, layerLabel: 'L4' });
  const edge = graphStore.addEdge(TEST_GRAPH_ID, { from: fromId, to: toId, type: EdgeType.DependsOn });
  const deleted = graphStore.deleteEdge(TEST_GRAPH_ID, edge.id);
  expect(deleted).toBe(true);
});

test('MCP - Query graph', () => {
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  expect(g).toBeDefined();
  expect(g.nodes.length).toBeGreaterThan(0);
  expect(g.edges.length).toBeGreaterThan(0);
});

console.log('\n=== 6. Code Sync ===');

test('Graph reflects structure', () => {
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const l3 = g.nodes.filter(n => n.layer === L3).length;
  const l4 = g.nodes.filter(n => n.layer === L4).length;
  const l5 = g.nodes.filter(n => n.layer === L5).length;
  expect(l3).toBeGreaterThanOrEqual(1);
  expect(l4).toBeGreaterThanOrEqual(1);
  expect(l5).toBeGreaterThanOrEqual(1);
});

test('Edges represent dependencies', () => {
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const deps = g.edges.filter(e => e.type === 'depends_on').length;
  expect(deps).toBeGreaterThan(0);
});

console.log('\n=== 7. Workflow ===');

test('Workflow - Epic to Stories', () => {
  const epicId = 'wf_epic_' + Date.now();
  graphStore.addNode(TEST_GRAPH_ID, { id: epicId, label: 'Auth System', type: 'epic', layer: L3, layerLabel: 'L3', properties: {} });
  
  const stories = [
    { label: 'User Register', hours: 16 },
    { label: 'User Login', hours: 8 },
    { label: 'Password Reset', hours: 12 }
  ];
  
  stories.forEach((s, i) => {
    const id = 'wf_story_' + i + '_' + Date.now();
    graphStore.addNode(TEST_GRAPH_ID, { id, label: s.label, type: 'story', layer: L4, layerLabel: 'L4', properties: {} });
    graphStore.addEdge(TEST_GRAPH_ID, { from: epicId, to: id, type: EdgeType.DependsOn });
  });
  
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const epicCount = g.nodes.filter(n => n.layer === L3).length;
  const storyCount = g.nodes.filter(n => n.layer === L4).length;
  expect(epicCount).toBeGreaterThanOrEqual(2);
  expect(storyCount).toBeGreaterThanOrEqual(4);
});

test('Workflow - Impact analysis', () => {
  const a = 'imp_a_' + Date.now();
  const b = 'imp_b_' + Date.now();
  const c = 'imp_c_' + Date.now();
  
  graphStore.addNode(TEST_GRAPH_ID, { id: a, label: 'A', type: 'f', layer: L3, layerLabel: 'L3' });
  graphStore.addNode(TEST_GRAPH_ID, { id: b, label: 'B', type: 'f', layer: L4, layerLabel: 'L4' });
  graphStore.addNode(TEST_GRAPH_ID, { id: c, label: 'C', type: 'f', layer: L5, layerLabel: 'L5' });
  
  graphStore.addEdge(TEST_GRAPH_ID, { from: a, to: b, type: EdgeType.DependsOn });
  graphStore.addEdge(TEST_GRAPH_ID, { from: b, to: c, type: EdgeType.DependsOn });
  
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const outgoing = g.edges.filter(e => e.from === a);
  expect(outgoing.length).toBe(1);
  expect(outgoing[0].to).toBe(b);
});

test('Workflow - Session management', () => {
  const session = graphStore.createSession(TEST_GRAPH_ID);
  expect(session.sessionId).toBeDefined();
  
  const q = graphStore.addClarificationQuestion(session.sessionId, {
    nodeId: 'l3', question: 'Priority?', options: [
      { id: 'h', label: 'High' },
      { id: 'm', label: 'Medium' }
    ]
  });
  expect(q.question).toBe('Priority?');
  
  const answered = graphStore.answerClarificationQuestion(session.sessionId, 0, ['h']);
  expect(answered.status).toBe('answered');
});

console.log('\n=== 8. Visualization ===');

test('Prepare React Flow nodes', () => {
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const nodes = g.nodes.map(n => ({
    id: n.id,
    type: n.layer === L3 ? 'feature' : 'module',
    position: { x: Math.random() * 400, y: Math.random() * 400 },
    data: { label: n.label, layer: n.layer }
  }));
  expect(nodes.length).toBe(g.nodes.length);
  expect(nodes[0].id).toBeDefined();
  expect(nodes[0].data.label).toBeDefined();
});

test('Prepare React Flow edges', () => {
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const edges = g.edges.map(e => ({
    id: e.id, source: e.from, target: e.to, type: 'custom',
    markerEnd: { type: 'arrowclosed', color: '#667eea' }
  }));
  expect(edges.length).toBe(g.edges.length);
  expect(edges[0].source).toBeDefined();
  expect(edges[0].target).toBeDefined();
});

test('Graph statistics', () => {
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const layerDist = new Map();
  g.nodes.forEach(n => {
    const c = layerDist.get(n.layer) || 0;
    layerDist.set(n.layer, c + 1);
  });
  expect(g.nodes.length).toBeGreaterThan(0);
  expect(g.edges.length).toBeGreaterThan(0);
  expect(layerDist.size).toBeGreaterThan(0);
});

console.log('\n=== 9. Human-Graph Interaction ===');

test('Simulate node drag - update position', () => {
  const id = 'drag_' + Date.now();
  graphStore.addNode(TEST_GRAPH_ID, { id, label: 'Drag', type: 'f', layer: L4, layerLabel: 'L4', properties: { position: { x: 100, y: 100 } } });
  graphStore.updateNode(TEST_GRAPH_ID, id, { properties: { position: { x: 300, y: 200 } } });
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const n = g.nodes.find(x => x.id === id);
  expect(n.properties.position.x).toBe(300);
  expect(n.properties.position.y).toBe(200);
});

test('Simulate node edit - update label', () => {
  const id = 'edit_' + Date.now();
  graphStore.addNode(TEST_GRAPH_ID, { id, label: 'Original', type: 'f', layer: L4, layerLabel: 'L4' });
  graphStore.updateNode(TEST_GRAPH_ID, id, { label: 'Edited' });
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const n = g.nodes.find(x => x.id === id);
  expect(n.label).toBe('Edited');
});

test('Simulate delete node', () => {
  const id = 'del_' + Date.now();
  graphStore.addNode(TEST_GRAPH_ID, { id, label: 'Delete', type: 'f', layer: L5, layerLabel: 'L5' });
  const r = graphStore.deleteNode(TEST_GRAPH_ID, id);
  expect(r.deleted).toBe(true);
});

test('Simulate add child node', () => {
  const parentId = 'parent_' + Date.now();
  const childId = 'child_' + Date.now();
  
  graphStore.addNode(TEST_GRAPH_ID, { id: parentId, label: 'Parent', type: 'f', layer: L3, layerLabel: 'L3' });
  graphStore.addNode(TEST_GRAPH_ID, { id: childId, label: 'Child', type: 'f', layer: L4, layerLabel: 'L4' });
  graphStore.addEdge(TEST_GRAPH_ID, { from: parentId, to: childId, type: EdgeType.DependsOn });
  
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const e = g.edges.find(x => x.from === parentId && x.to === childId);
  expect(e.from).toBe(parentId);
  expect(e.to).toBe(childId);
});

test('Simulate search filter', () => {
  graphStore.addNode(TEST_GRAPH_ID, { id: 's1_' + Date.now(), label: 'Search Test 1', type: 'f', layer: L4, layerLabel: 'L4' });
  graphStore.addNode(TEST_GRAPH_ID, { id: 's2_' + Date.now(), label: 'Search Test 2', type: 'f', layer: L4, layerLabel: 'L4' });
  graphStore.addNode(TEST_GRAPH_ID, { id: 's3_' + Date.now(), label: 'Other Node', type: 'f', layer: L4, layerLabel: 'L4' });
  
  const g = graphStore.getGraph(TEST_GRAPH_ID);
  const filtered = g.nodes.filter(n => n.label.includes('Search Test'));
  expect(filtered.length).toBeGreaterThanOrEqual(2);
});

// Summary
console.log('\n' + '='.repeat(50));
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
console.log('Passed:', passed);
console.log('Failed:', failed);
console.log('Total:', passed + failed);
if (passed + failed > 0) {
  console.log('Pass Rate:', ((passed / (passed + failed)) * 100).toFixed(2) + '%');
}

if (failed > 0) {
  console.log('\nFailed tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log('  -', r.name, ':', r.error);
  });
}

// Save results using dynamic import
import * as fs from 'fs';
const resultData = {
  timestamp: new Date().toISOString(),
  summary: { total: passed + failed, passed, failed, passRate: ((passed / Math.max(passed + failed, 1)) * 100).toFixed(2) + '%' },
  results
};
fs.writeFileSync('./comprehensive-e2e-test-results.json', JSON.stringify(resultData, null, 2));

console.log('\nResults saved to: comprehensive-e2e-test-results.json');
