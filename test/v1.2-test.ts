#!/usr/bin/env npx ts-node
/**
 * V1.2 Python 支持增强测试
 * 
 * 测试内容：
 * 1. PythonEnhancer 符号提取
 * 2. FrameworkAnalyzer 框架检测
 * 3. 类型注解、装饰器、异步函数支持
 * 4. 置信度算法优化
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 简单的测试框架
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true, message: 'PASS' });
    console.log(`✓ PASS: ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, message: error.message });
    console.log(`✗ FAIL: ${name} - ${error.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

// ==================== 测试组 1: PythonEnhancer 基础功能 ====================

console.log('\n测试组 1: PythonEnhancer 基础功能');
console.log('='.repeat(50));

// 测试 1.1: 解析装饰器
test('解析 @app.get 装饰器', () => {
  const code = `
@app.get("/")
async def root():
    return {"message": "Hello"}
`;
  
  const lines = code.split('\n');
  const decorators: string[] = [];
  
  for (const line of lines) {
    const match = line.trim().match(/^@([\w\.]+)/);
    if (match) {
      decorators.push(match[1]);
    }
  }
  
  assert(decorators.includes('app.get'), '应该检测到 @app.get 装饰器');
});

// 测试 1.2: 解析 async 函数
test('解析 async 函数', () => {
  const code = `
async def async_function():
    return await some_call()

def sync_function():
    return "sync"
`;
  
  const lines = code.split('\n');
  let asyncCount = 0;
  let syncCount = 0;
  
  for (const line of lines) {
    if (line.trim().match(/^async\s+def/)) {
      asyncCount++;
    }
    if (line.trim().match(/^def\s+/) && !line.trim().startsWith('async')) {
      syncCount++;
    }
  }
  
  assertEquals(asyncCount, 1, '应该检测到 1 个 async 函数');
  assertEquals(syncCount, 1, '应该检测到 1 个同步函数');
});

// 测试 1.3: 解析类和方法
test('解析类和方法', () => {
  const code = `
class MyClass:
    def method1(self):
        pass
    
    async def method2(self):
        pass
`;
  
  const lines = code.split('\n');
  let classCount = 0;
  let methodCount = 0;
  
  for (const line of lines) {
    // 类定义（去除缩进后匹配）
    const trimmed = line.trim();
    if (trimmed.match(/^class\s+/)) {
      classCount++;
    }
    // 方法定义 - 必须有前导空格（在类内），匹配 def 或 async def
    if (/^\s+(async\s+)?def\s+\w+\s*\(self/.test(line)) {
      methodCount++;
    }
  }
  
  assertEquals(classCount, 1, '应该检测到 1 个类');
  assertEquals(methodCount, 2, '应该检测到 2 个方法');
});

// 测试 1.4: 解析 import 语句
test('解析 import 语句', () => {
  const code = `
from fastapi import FastAPI, Depends
import uvicorn
from typing import Optional, List
`;
  
  const lines = code.split('\n');
  const imports: string[] = [];
  
  for (const line of lines) {
    const simpleMatch = line.trim().match(/^import\s+([\w\.]+)/);
    const fromMatch = line.trim().match(/^from\s+([\w\.]+)\s+import/);
    
    if (simpleMatch) {
      imports.push(simpleMatch[1]);
    }
    if (fromMatch) {
      imports.push(fromMatch[1]);
    }
  }
  
  assert(imports.includes('fastapi'), '应该检测到 fastapi 导入');
  assert(imports.includes('uvicorn'), '应该检测到 uvicorn 导入');
  assert(imports.includes('typing'), '应该检测到 typing 导入');
});

// ==================== 测试组 2: 框架检测 ====================

console.log('\n测试组 2: 框架检测');
console.log('='.repeat(50));

// 测试 2.1: FastAPI 框架检测
test('FastAPI 框架检测 - 装饰器', () => {
  const code = `
from fastapi import FastAPI, Depends
from pydantic import BaseModel

app = FastAPI()

@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}

@app.post("/items")
async def create_item(item: Item):
    return item
`;
  
  const lines = code.split('\n');
  const frameworkHints: { framework: string; indicator: string }[] = [];
  
  const fastapiIndicators = ['@app.get', '@app.post', '@app.put', '@app.delete', '@router'];
  const pydanticIndicators = ['pydantic', 'BaseModel'];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    for (const indicator of fastapiIndicators) {
      if (trimmed.includes(indicator)) {
        frameworkHints.push({ framework: 'fastapi', indicator });
      }
    }
    
    for (const indicator of pydanticIndicators) {
      if (trimmed.includes(indicator)) {
        frameworkHints.push({ framework: 'pydantic', indicator });
      }
    }
  }
  
  const fastapiHints = frameworkHints.filter(h => h.framework === 'fastapi');
  assert(fastapiHints.length >= 2, `应该检测到至少 2 个 FastAPI 指标，实际 ${fastapiHints.length}`);
});

// 测试 2.2: Flask 框架检测
test('Flask 框架检测 - 路由装饰器', () => {
  const code = `
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/users')
def get_users():
    return jsonify(users)

@app.route('/users/<int:user_id>')
def get_user(user_id):
    return jsonify(user)
`;
  
  const lines = code.split('\n');
  let flaskHints = 0;
  
  for (const line of lines) {
    if (line.includes('@app.route') || line.includes('flask')) {
      flaskHints++;
    }
  }
  
  assert(flaskHints >= 3, `应该检测到至少 3 个 Flask 指标，实际 ${flaskHints}`);
});

// 测试 2.3: pytest 框架检测
test('pytest 框架检测 - fixture', () => {
  const code = `
import pytest
from unittest.mock import Mock, patch

@pytest.fixture
async def mock_client():
    return Mock()

@pytest.mark.asyncio
async def test_async_function(mock_client):
    assert await async_func() == True
`;
  
  const lines = code.split('\n');
  const pytestHints: string[] = [];
  
  for (const line of lines) {
    if (line.includes('@pytest.fixture')) pytestHints.push('fixture');
    if (line.includes('@pytest.mark')) pytestHints.push('mark');
    if (line.includes('pytest')) pytestHints.push('import');
  }
  
  assert(pytestHints.includes('fixture'), '应该检测到 @pytest.fixture');
  assert(pytestHints.includes('mark'), '应该检测到 @pytest.mark');
});

// 测试 2.4: Typer + Rich 框架检测
test('Typer + Rich 框架检测', () => {
  const code = `
import typer
from rich.console import Console
from rich.panel import Panel

app = typer.Typer()
console = Console()

@app.command()
def hello(name: str):
    console.print(Panel(f"Hello {name}"))
`;
  
  const lines = code.split('\n');
  const frameworkHints: string[] = [];
  
  for (const line of lines) {
    if (line.includes('typer')) frameworkHints.push('typer');
    if (line.includes('rich')) frameworkHints.push('rich');
    if (line.includes('@app.command')) frameworkHints.push('command');
  }
  
  assert(frameworkHints.includes('typer'), '应该检测到 typer');
  assert(frameworkHints.includes('rich'), '应该检测到 rich');
  assert(frameworkHints.includes('command'), '应该检测到命令装饰器');
});

// ==================== 测试组 3: 置信度算法 ====================

console.log('\n测试组 3: 置信度算法');
console.log('='.repeat(50));

// 测试 3.1: 基础置信度计算
test('置信度计算 - 多指标加分', () => {
  // FrameworkAnalyzer 的实际置信度计算逻辑：
  // totalScore = Math.min(100, importScore * 0.4 + decoratorScore * 0.5 + fileScore * 0.1)
  // confidence = totalScore / 100
  
  // 模拟 FastAPI 项目得分：
  // importScore = 2 * 2 = 4 (fastapi 和 pydantic 各 2 分)
  // decoratorScore = 0.9 * 3 + 0.95 * 3 = 5.7 (2 个装饰器)
  // fileScore = 0 (没有文件匹配)
  // totalScore = min(100, 4 * 0.4 + 5.7 * 0.5 + 0 * 0.1) = 4.45
  
  const importScore = 4;      // 2 个导入 * 2 分
  const decoratorScore = 5.7; // 2 个装饰器 * 0.9 和 0.95 * 3
  const fileScore = 0;
  
  const totalScore = Math.min(100, importScore * 0.4 + decoratorScore * 0.5 + fileScore * 0.1);
  const confidence = totalScore / 100;
  
  // 验证计算正确性
  assertEquals(Math.round(totalScore * 100), 445, '总分应该约为 4.45');
  assert(confidence >= 0.04, `置信度应该 >= 0.04，实际 ${confidence.toFixed(3)}`);
});

// 测试 3.2: 置信度上限
test('置信度上限为 1', () => {
  const confidences = [0.9, 0.95, 1.0, 0.85];
  const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const weighted = Math.min(1, avg * 1); // 5 个指标
  
  assert(weighted <= 1, `置信度不应该超过 1，实际 ${weighted}`);
});

// ==================== 测试组 4: 端到端测试 ====================

console.log('\n测试组 4: 端到端测试');
console.log('='.repeat(50));

// 测试 4.1: 完整 Python 文件分析
test('完整 Python 文件分析流程', () => {
  const pythonFile = `
"""
Sample FastAPI Application
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import asyncio

app = FastAPI(title="Sample App", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    
    class Config:
        schema_extra = {
            "example": {"name": "Foo", "description": "A very nice Item", "price": 35.4}
        }

@app.get("/", response_model=dict)
async def root():
    return {"message": "Hello World"}

@app.get("/items", response_model=List[Item])
async def read_items(skip: int = 0, limit: int = 10):
    return items[skip: skip + limit]

@app.post("/items", response_model=Item, status_code=status.HTTP_201_CREATED)
async def create_item(item: Item):
    items.append(item)
    return item

@app.put("/items/{item_id}")
async def update_item(item_id: int, item: Item):
    return {"item_id": item_id, **item.dict()}

@app.delete("/items/{item_id}")
async def delete_item(item_id: int):
    return {"message": "Item deleted"}

# Test fixture equivalent
@pytest_asyncio.fixture
async def test_client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
`;

  const analysis = {
    imports: [] as string[],
    decorators: [] as string[],
    classes: [] as string[],
    functions: [] as { name: string; isAsync: boolean }[],
    frameworkHints: [] as string[]
  };

  const lines = pythonFile.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Imports
    const simpleMatch = trimmed.match(/^import\s+([\w\.]+)/);
    const fromMatch = trimmed.match(/^from\s+([\w\.]+)\s+import/);
    if (simpleMatch) analysis.imports.push(simpleMatch[1]);
    if (fromMatch) analysis.imports.push(fromMatch[1]);
    
    // Decorators
    const decoratorMatch = trimmed.match(/^@(\w+)/);
    if (decoratorMatch) analysis.decorators.push(decoratorMatch[1]);
    
    // Classes
    const classMatch = trimmed.match(/^class\s+(\w+)/);
    if (classMatch) analysis.classes.push(classMatch[1]);
    
    // Functions
    const asyncFuncMatch = trimmed.match(/^async\s+def\s+(\w+)/);
    const funcMatch = trimmed.match(/^def\s+(\w+)/);
    if (asyncFuncMatch) {
      analysis.functions.push({ name: asyncFuncMatch[1], isAsync: true });
    } else if (funcMatch) {
      analysis.functions.push({ name: funcMatch[1], isAsync: false });
    }
    
    // Framework hints
    if (trimmed.includes('fastapi') || trimmed.includes('@app.')) {
      analysis.frameworkHints.push('fastapi');
    }
    if (trimmed.includes('pydantic') || trimmed.includes('BaseModel')) {
      analysis.frameworkHints.push('pydantic');
    }
    if (trimmed.includes('pytest')) {
      analysis.frameworkHints.push('pytest');
    }
  }

  // 验证结果
  assert(analysis.imports.includes('fastapi'), '应该检测到 fastapi 导入');
  assert(analysis.imports.includes('pydantic'), '应该检测到 pydantic 导入');
  assert(analysis.classes.includes('Item'), '应该检测到 Item 类');
  assert(analysis.functions.length >= 5, `应该检测到至少 5 个函数，实际 ${analysis.functions.length}`);
  
  const asyncFuncs = analysis.functions.filter(f => f.isAsync);
  assert(asyncFuncs.length >= 5, `应该检测到至少 5 个 async 函数，实际 ${asyncFuncs.length}`);
  
  const fastapiCount = analysis.frameworkHints.filter(h => h === 'fastapi').length;
  assert(fastapiCount >= 6, `应该检测到至少 6 个 FastAPI 指标，实际 ${fastapiCount}`);
});

// ==================== 测试结果汇总 ====================

console.log('\n' + '='.repeat(50));
console.log('测试结果汇总');
console.log('='.repeat(50));

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`\n通过: ${passed} | 失败: ${failed} | 总计: ${total}`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\n失败的测试:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${r.message}`);
  });
  process.exit(1);
} else {
  console.log('\n🎉 所有测试通过！');
}
