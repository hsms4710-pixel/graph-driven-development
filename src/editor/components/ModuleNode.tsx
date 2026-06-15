import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

const ModuleNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`module-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-content">
        <div className="node-icon">📦</div>
        <div className="node-label">{data.label}</div>
        <div className="node-type">模块</div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

export default ModuleNode;
