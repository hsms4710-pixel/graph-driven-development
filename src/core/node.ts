/**
 * Legacy graph node used by the core Graph and serializer modules.
 *
 * The MCP layer has newer domain-specific node types, but the core graph
 * utilities still operate on this generic node shape.
 */

export type NodeType =
  | 'constitution'
  | 'tech_stack'
  | 'architecture'
  | 'feature'
  | 'module'
  | 'task'
  | 'class'
  | 'function'
  | 'file'
  | 'unknown';

export interface NodeConfig {
  id?: string;
  label: string;
  type?: NodeType;
  layer?: string;
  properties?: Record<string, any>;
  position?: { x: number; y: number };
  status?: string;
}

export class Node {
  public readonly id: string;
  public label: string;
  public type: NodeType;
  public layer?: string;
  public properties: Record<string, any>;
  public position: { x: number; y: number };
  public status?: string;

  constructor(config: NodeConfig) {
    this.id = config.id || this.generateId();
    this.label = config.label;
    this.type = config.type || 'feature';
    this.layer = config.layer;
    this.properties = config.properties || {};
    this.position = config.position || { x: 0, y: 0 };
    this.status = config.status;
  }

  setProperty(key: string, value: any): void {
    this.properties[key] = value;
  }

  getProperty<T = any>(key: string): T | undefined {
    return this.properties[key] as T | undefined;
  }

  toJSON(): object {
    return {
      id: this.id,
      label: this.label,
      type: this.type,
      layer: this.layer,
      properties: this.properties,
      position: this.position,
      status: this.status
    };
  }

  static fromJSON(data: any): Node {
    return new Node({
      id: data.id,
      label: data.label,
      type: data.type,
      layer: data.layer,
      properties: data.properties,
      position: data.position,
      status: data.status
    });
  }

  private generateId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
