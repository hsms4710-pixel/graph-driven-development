/**
 * Node Detail Panel - 节点详情面板
 * 
 * 显示选中节点的详细信息，支持编辑和操作
 */

import React, { useState } from 'react';
import { NodeData } from '../mcp/types';

interface NodeDetailPanelProps {
  nodeId: string;
  onClose: () => void;
}

// 获取层级颜色
function getLayerColor(layer: string): string {
  const colors: Record<string, string> = {
    'L1_Constitution': '#8b5cf6',
    'L2_TechStack': '#3b82f6',
    'L3_Epic': '#10b981',
    'L4_Story': '#f59e0b',
    'L5_Task': '#ef4444'
  };
  return colors[layer] || '#6b7280';
}

// 获取层级文本颜色
function getLayerTextColor(layer: string): string {
  const darkColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  return darkColors.includes(getLayerColor(layer)) ? 'white' : 'black';
}

// 获取层级标签
function getLayerLabel(layer: string): string {
  const labels: Record<string, string> = {
    'L1_Constitution': 'L1 - 项目宪法',
    'L2_TechStack': 'L2 - 技术栈',
    'L3_Epic': 'L3 - 史诗/功能',
    'L4_Story': 'L4 - 故事/模块',
    'L5_Task': 'L5 - 任务/文件'
  };
  return labels[layer] || layer;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  nodeId,
  onClose
}) => {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  
  // 模拟节点数据
  const node: NodeData = {
    id: nodeId,
    label: label || '未命名节点',
    layer: 'L3_Epic',
    type: 'feature',
    properties: {
      description: description || '没有描述'
    }
  };
  
  return (
    <div className="node-detail-panel">
      <div className="panel-header">
        <h3>节点详情</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="panel-content">
        {/* 节点信息 */}
        <div className="node-info">
          <div className="info-item">
            <span className="label">节点 ID:</span>
            <span className="value">{node.id}</span>
          </div>
          <div className="info-item">
            <span className="label">层级:</span>
            <span 
              className="value layer-badge"
              style={{ 
                background: getLayerColor(node.layer),
                color: getLayerTextColor(node.layer)
              }}
            >
              {getLayerLabel(node.layer)}
            </span>
          </div>
          <div className="info-item">
            <span className="label">类型:</span>
            <span className="value">{node.type}</span>
          </div>
        </div>
        
        {/* 编辑表单 */}
        <div className="edit-form">
          <div className="form-group">
            <label>节点标签</label>
            <input 
              type="text" 
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="输入节点标签"
            />
          </div>
          <div className="form-group">
            <label>描述</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入节点描述"
              rows={4}
            />
          </div>
        </div>
        
        {/* 属性 */}
        <div className="properties">
          <h4>属性</h4>
          <div className="properties-list">
            {Object.entries(node.properties).map(([key, value]) => (
              <div key={key} className="property-item">
                <span className="property-key">{key}:</span>
                <span className="property-value">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailPanel;
