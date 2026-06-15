/**
 * Node - 图中的节点，代表代码元素
 */

export type NodeType = 
  | 'feature'      // 功能模块
  | 'module'       // 模块
  | 'class'        // 类
  | 'function'     // 函数
  | 'interface'    // 接口
  | 'type'         // 类型
  | 'variable'     // 变量
  | 'constant'     // 常量
  | 'file'         // 文件
  | 'directory';   // 目录

export interface NodeConfig {
  id?: string;
  label: string;
  type: NodeType;
  properties?: Record<string, any>;
  position?: { x: number; y: number };
}

export class Node {
  public readonly id: string;
  public label: string;
  public type: NodeType;
  public properties: Record<string, any>;
  public position: { x: number; y: number };
  
  constructor(config: NodeConfig) {
    this.id = config.id || this.generateId();
    this.label = config.label;
    this.type = config.type;
    this.properties = config.properties || {};
    this.position = config.position || { x: 0, y: 0 };
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
   * 检查是否有属性
   */
  hasProperty(key: string): boolean {
    return key in this.properties;
  }
  
  /**
   * 获取所有属性
   */
  getAllProperties(): Record<string, any> {
    return { ...this.properties };
  }
  
  /**
   * 序列化为 JSON
   */
  toJSON(): object {
    return {
      id: this.id,
      label: this.label,
      type: this.type,
      properties: this.properties,
      position: this.position
    };
  }
  
  /**
   * 从 JSON 反序列化
   */
  static fromJSON(data: any): Node {
    return new Node({
      id: data.id,
      label: data.label,
      type: data.type,
      properties: data.properties,
      position: data.position
    });
  }
  
  private generateId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
