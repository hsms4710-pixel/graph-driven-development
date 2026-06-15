import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

const FeatureNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`feature-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-content">
        <div className="node-icon">⚡</div>
        <div className="node-label">{data.label}</div>
        <div className="node-type">功能</div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

export default FeatureNode;
