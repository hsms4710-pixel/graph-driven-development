import { useState } from 'react';
import GraphEditor from './editor/GraphEditor';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Graph-Driven Development</h1>
        <p>从想法到代码，用图驱动整个开发流程</p>
      </header>
      <main className="app-main">
        <GraphEditor />
      </main>
    </div>
  );
}

export default App;
