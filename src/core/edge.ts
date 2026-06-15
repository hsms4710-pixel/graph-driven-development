/**
 * Edge - 图中的边，代表节点之间的关系
 */

export type EdgeType =
  | 'depends_on'      // 依赖
  | 'calls'           // 调用
  | 'implements'      // 实现
  | 'extends'         // 继承
  | 'imports'         // 导入
  | 'exports'         // 导出
  | 'contains'        // 包含
  | 'uses'            // 使用
  | 'references';     // 引用

export interface EdgeConfig {
  id?: string;
  from: string;
  to: string;
  type: EdgeType;
  label?: string;
  properties?: Record<string, any>;
  weight?: number;    // 边的权重，用于排序
}

export class Edge {
  public readonly id: string;
  public from: string;
  public to: string;
  public type: EdgeType;
  public label: string;
  public properties: Record<string, any>;
  public weight: number;
  
  constructor(config: EdgeConfig) {
    this.id = config.id || this.generateId();
    this.from = config.from;
    this.to = config.to;
    this.type = config.type;
    this.label = config.label || this.getDefaultLabel();
    this.properties = config.properties || {};
    this.weight = config.weight || 1;
  }
  
  /**
   * 获取类型的默认标签
   */
  private getDefaultLabel(): string {
    const labels: Record<EdgeType, string> = {
      'depends_on': 'depends on',
      'calls': 'calls',
      'implements': 'implements',
      'extends': 'extends',
      'imports': 'imports',
      'exports': 'exports',
      'contains': 'contains',
      'uses': 'uses',
      'references': 'references'
    };
    return labels[this.type] || '';
  }
  
  /**
   * 设置属性
   */
  setProperty(key: string, value: any): void {
    this.properties[key] = value;
  }
  
  /**
   * 获取属性
   */
  getProperty(key: string): any {
    return this.properties[key];
  }
  
  /**
   * 序列化为 JSON
   */
  toJSON(): object {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      type: this.type,
      label: this.label,
      properties: this.properties,
      weight: this.weight
    };
  }
  
  /**
   * 从 JSON 反序列化
   */
  static fromJSON(data: any): Edge {
    return new Edge({
      id: data.id,
      from: data.from,
      to: data.to,
      type: data.type,
      label: data.label,
      properties: data.properties,
      weight: data.weight
    });
  }
  
  private generateId(): string {
    return `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
