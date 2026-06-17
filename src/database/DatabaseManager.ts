/**
 * Database Manager
 * 
 * 管理数据库集成，支持：
 * - PostgreSQL (Relational)
 * - MySQL (Relational)
 * - MongoDB (Document)
 * - Redis (Cache)
 * - Elasticsearch (Search)
 * - DynamoDB (NoSQL - AWS)
 * - DynamoDB (NoSQL - Self-hosted)
 */

// ==================== 类型定义 ====================

export type DatabaseType = 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'elasticsearch' | 'dynamodb';

export interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  name: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  connectionLimit?: number;
  poolSize?: number;
}

export interface DatabaseSchema {
  name: string;
  version: string;
  tables: TableDefinition[];
  indexes: IndexDefinition[];
  relationships: Relationship[];
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  constraints?: Constraint[];
  options?: TableOptions;
}

export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  nullable?: boolean;
  default?: unknown;
  primaryKey?: boolean;
  unique?: boolean;
  autoIncrement?: boolean;
  comment?: string;
  references?: Reference;
}

export type ColumnType = 
  | 'string' | 'text' | 'boolean' | 'number' | 'bigint' | 'float' | 'double'
  | 'date' | 'datetime' | 'timestamp' | 'time' | 'interval'
  | 'binary' | 'blob' | 'json' | 'jsonb' | 'array' | 'uuid' | 'enum';

export interface Reference {
  table: string;
  column: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface Constraint {
  type: 'primary' | 'unique' | 'foreign' | 'check';
  columns: string[];
  name?: string;
  references?: Reference;
  expression?: string;
}

export interface IndexDefinition {
  name: string;
  tableName: string;
  columns: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
}

export interface Relationship {
  from: { table: string; column: string };
  to: { table: string; column: string };
  type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
}

export interface TableOptions {
  comment?: string;
  engine?: string; // MySQL
  charset?: string; // MySQL
  collation?: string; // MySQL
}

// ==================== Schema Generator ====================

export class SchemaGenerator {
  
  /**
   * 生成 Prisma Schema
   */
  static generatePrisma(schema: DatabaseSchema): string {
    const parts: string[] = [];
    
    parts.push(`// Prisma Schema - Auto-generated
// Database: ${schema.name}
// Version: ${schema.version}
`);
    
    // 生成模型
    for (const table of schema.tables) {
      parts.push(this.generatePrismaModel(table, schema));
      parts.push('');
    }
    
    return parts.join('\n');
  }
  
  private static generatePrismaModel(table: TableDefinition, schemaContext?: DatabaseSchema): string {
    const lines: string[] = [];
    lines.push(`model ${this.toPascalCase(table.name)} {`);
    
    for (const column of table.columns) {
      const colDef = this.generatePrismaColumn(column);
      lines.push(`  ${colDef}`);
    }
    
    // 索引
    const allIndexes = (schemaContext?.indexes || []) as IndexDefinition[];
    const tableIndexes = allIndexes.filter(i => i.tableName === table.name);
    for (const index of tableIndexes) {
      const unique = index.unique ? 'Unique' : '';
      lines.push(`  @@index([${index.columns.join(', ')}], map: "${index.name}", ${unique})`);
    }
    
    lines.push('}');
    return lines.join('\n');
  }
  
  private static generatePrismaColumn(column: ColumnDefinition): string {
    let definition = column.name;
    
    // 类型映射
    const typeMap: Record<ColumnType, string> = {
      'string': 'String',
      'text': 'String',
      'boolean': 'Boolean',
      'number': 'Int',
      'bigint': 'BigInt',
      'float': 'Float',
      'double': 'Float',
      'date': 'DateTime',
      'datetime': 'DateTime',
      'timestamp': 'DateTime',
      'time': 'DateTime',
      'interval': 'Int',
      'binary': 'Bytes',
      'blob': 'Bytes',
      'json': 'Json',
      'jsonb': 'Json',
      'array': 'String[]',
      'uuid': 'String',
      'enum': 'String',
    };
    
    definition += ' ' + typeMap[column.type];
    
    // 主键
    if (column.primaryKey) {
      definition += ' @id';
    }
    
    // 自增
    if (column.autoIncrement) {
      definition += ' @default(autoincrement())';
    }
    
    // 默认值
    if (!column.autoIncrement && column.default !== undefined) {
      if (typeof column.default === 'string') {
        definition += ` @default("${column.default}")`;
      } else {
        definition += ` @default(${column.default})`;
      }
    }
    
    // 外键
    if (column.references) {
      definition += ` @relation(${column.references.table})`;
    }
    
    // 注释
    if (column.comment) {
      definition += ` // ${column.comment}`;
    }
    
    return definition;
  }
  
  private static toPascalCase(str: string): string {
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  }
  
  /**
   * 生成 Drizzle ORM Schema
   */
  static generateDrizzle(schema: DatabaseSchema): string {
    const parts: string[] = [];
    
    parts.push(`import { pgTable, text, varchar, integer, bigint, boolean, timestamp, json, uuid, index } from 'drizzle-orm/pg-core';

// Database Schema - Auto-generated
// Version: ${schema.version}
`);
    
    for (const table of schema.tables) {
      parts.push(this.generateDrizzleTable(table));
      parts.push('');
    }
    
    return parts.join('\n');
  }
  
  private static generateDrizzleTable(table: TableDefinition, schemaContext?: { indexes: IndexDefinition[] }): string {
    const columns = table.columns
      .map(col => this.generateDrizzleColumn(col))
      .join(',\n    ');
    
    let schema = `export const ${table.name} = pgTable('${table.name}', {\n    ${columns}\n}`;
    
    // 索引
    const drizzleIndexes = (schemaContext?.indexes || []).filter(i => i.tableName === table.name);
    for (const index of drizzleIndexes) {
      const unique = index.unique ? ', { unique: true }' : '';
      schema += `\n    ,${index.name}: index(${index.columns.map(c => `"${c}"`).join(', ')})${unique}`;
    }
    
    schema += '\n);';
    return schema;
  }
  
  private static generateDrizzleColumn(column: ColumnDefinition): string {
    const typeMap: Record<ColumnType, string> = {
      'string': 'varchar(255)',
      'text': 'text',
      'boolean': 'boolean',
      'number': 'integer',
      'bigint': 'bigint',
      'float': 'float',
      'double': 'doublePrecision',
      'date': 'date',
      'datetime': 'timestamp',
      'timestamp': 'timestamp',
      'time': 'time',
      'interval': 'integer',
      'binary': 'bytea',
      'blob': 'bytea',
      'json': 'json',
      'jsonb': 'jsonb',
      'array': 'text[]',
      'uuid': 'uuid',
      'enum': 'text',
    };
    
    let definition = `  ${column.name}: ${typeMap[column.type]}`;
    
    if (column.primaryKey) {
      definition += '.primaryKey()';
    }
    
    if (column.autoIncrement) {
      definition += '.autoincrement()';
    }
    
    if (!column.nullable) {
      definition += '().notNull()';
    }
    
    if (column.default !== undefined && !column.autoIncrement) {
      if (typeof column.default === 'string') {
        definition += `.default("${column.default}")`;
      } else {
        definition += `.default(${column.default})`;
      }
    }
    
    return definition;
  }
  
  /**
   * 生成 SQL DDL
   */
  static generateSQL(schema: DatabaseSchema, dialect: 'postgresql' | 'mysql' = 'postgresql'): string {
    const parts: string[] = [];
    
    parts.push(`-- Database Schema: ${schema.name}
-- Version: ${schema.version}
-- Dialect: ${dialect}

BEGIN;
`);
    
    for (const table of schema.tables) {
      parts.push(SchemaGenerator.generateSQLTable(table, dialect));
      parts.push('');
    }
    
    // 索引
    for (const index of schema.indexes) {
      parts.push(SchemaGenerator.generateSQLIndex(index, dialect));
    }
    
    parts.push(`
COMMIT;
`);
    
    return parts.join('\n');
  }
  
  static generateSQLTable(table: TableDefinition, dialect: 'postgresql' | 'mysql'): string {
    const columns = table.columns
      .map(col => this.generateSQLColumn(col, dialect))
      .join(',\n    ');
    
    let sql = `CREATE TABLE "${table.name}" (\n    ${columns}`;
    
    // 主键约束
    const pkColumns = table.columns.filter(c => c.primaryKey).map(c => `"${c.name}"`);
    if (pkColumns.length > 0) {
      sql += `,\n    PRIMARY KEY (${pkColumns.join(', ')})`;
    }
    
    sql += '\n)';
    
    return sql;
  }
  
  private static generateSQLColumn(column: ColumnDefinition, dialect: 'postgresql' | 'mysql'): string {
    const typeMap: Record<ColumnType, Record<string, string>> = {
      'string': { postgresql: 'VARCHAR(255)', mysql: 'VARCHAR(255)' },
      'text': { postgresql: 'TEXT', mysql: 'TEXT' },
      'boolean': { postgresql: 'BOOLEAN', mysql: 'BOOLEAN' },
      'number': { postgresql: 'INTEGER', mysql: 'INT' },
      'bigint': { postgresql: 'BIGINT', mysql: 'BIGINT' },
      'float': { postgresql: 'FLOAT', mysql: 'FLOAT' },
      'double': { postgresql: 'DOUBLE PRECISION', mysql: 'DOUBLE' },
      'date': { postgresql: 'DATE', mysql: 'DATE' },
      'datetime': { postgresql: 'TIMESTAMP', mysql: 'DATETIME' },
      'timestamp': { postgresql: 'TIMESTAMP', mysql: 'TIMESTAMP' },
      'time': { postgresql: 'TIME', mysql: 'TIME' },
      'interval': { postgresql: 'INTERVAL', mysql: 'INT' },
      'binary': { postgresql: 'BYTEA', mysql: 'BLOB' },
      'blob': { postgresql: 'BYTEA', mysql: 'BLOB' },
      'json': { postgresql: 'JSON', mysql: 'JSON' },
      'jsonb': { postgresql: 'JSONB', mysql: 'JSON' },
      'array': { postgresql: 'TEXT[]', mysql: 'JSON' },
      'uuid': { postgresql: 'UUID', mysql: 'CHAR(36)' },
      'enum': { postgresql: 'TEXT', mysql: 'ENUM' },
    };
    
    const sqlType = typeMap[column.type]?.[dialect] || 'TEXT';
    let definition = `  "${column.name}" ${sqlType}`;
    
    if (column.primaryKey) {
      definition += ' PRIMARY KEY';
    }
    
    if (column.autoIncrement) {
      definition += ' AUTOINCREMENT';
    }
    
    if (!column.nullable) {
      definition += ' NOT NULL';
    }
    
    if (column.default !== undefined && !column.autoIncrement) {
      definition += ` DEFAULT ${column.default}`;
    }
    
    if (column.comment) {
      definition += ` COMMENT '${column.comment}'`;
    }
    
    return definition;
  }
  
  private static generateSQLIndex(index: IndexDefinition, dialect: 'postgresql' | 'mysql'): string {
    const unique = index.unique ? 'UNIQUE ' : '';
    const columns = index.columns.map(c => `"${c}"`).join(', ');
    
    return `CREATE ${unique}INDEX "${index.name}" ON "${index.tableName}" (${columns});`;
  }
  
  /**
   * 生成 TypeORM Entity
   */
  static generateTypeORM(schema: DatabaseSchema): string {
    const parts: string[] = [];
    
    parts.push(`import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Auto-generated TypeORM Entities
// Version: ${schema.version}
`);
    
    for (const table of schema.tables) {
      parts.push(SchemaGenerator.generateTypeORMEntity(table));
      parts.push('');
    }
    
    return parts.join('\n');
  }
  
  static generateTypeORMEntity(table: TableDefinition): string {
    const lines: string[] = [];
    lines.push(`@Entity('${table.name}')`);
    lines.push(`export class ${this.toPascalCase(table.name)} {`);
    
    for (const column of table.columns) {
      lines.push(this.generateTypeORMColumn(column));
    }
    
    lines.push('  @CreateDateColumn()');
    lines.push('  createdAt: Date;');
    
    lines.push('  @UpdateDateColumn()');
    lines.push('  updatedAt: Date;');
    
    lines.push('}');
    return lines.join('\n');
  }
  
  private static generateTypeORMColumn(column: ColumnDefinition): string {
    const decorators: string[] = [];
    
    if (column.autoIncrement && column.primaryKey) {
      decorators.push(`  @PrimaryGeneratedColumn()`);
    } else if (column.primaryKey) {
      decorators.push(`  @PrimaryColumn()`);
    }
    
    if (!decorators.length) {
      const typeMap: Record<ColumnType, string> = {
        'string': 'Column({ type: "varchar", length: 255 })',
        'text': 'Column({ type: "text" })',
        'boolean': 'Column({ type: "boolean" })',
        'number': 'Column({ type: "int" })',
        'bigint': 'Column({ type: "bigint" })',
        'float': 'Column({ type: "float" })',
        'double': 'Column({ type: "double precision" })',
        'date': 'Column({ type: "date" })',
        'datetime': 'Column({ type: "timestamp" })',
        'timestamp': 'Column({ type: "timestamp" })',
        'time': 'Column({ type: "time" })',
        'interval': 'Column({ type: "int" })',
        'binary': 'Column({ type: "blob" })',
        'blob': 'Column({ type: "blob" })',
        'json': 'Column({ type: "json" })',
        'jsonb': 'Column({ type: "jsonb" })',
        'array': 'Column({ type: "simple-array" })',
        'uuid': 'Column({ type: "uuid" })',
        'enum': 'Column({ type: "varchar" })',
      };
      
      const decorator = typeMap[column.type] || 'Column()';
      if (column.nullable) {
        decorators.push(`  @${decorator.replace(')', ', nullable: true)')}`);
      } else {
        decorators.push(`  @${decorator}`);
      }
    }
    
    decorators.push(`  ${column.name}: ${this.toTypeScriptType(column.type)};`);
    
    return decorators.join('\n');
  }
  
  private static toTypeScriptType(type: ColumnType): string {
    const map: Record<ColumnType, string> = {
      'string': 'string',
      'text': 'string',
      'boolean': 'boolean',
      'number': 'number',
      'bigint': 'number',
      'float': 'number',
      'double': 'number',
      'date': 'string',
      'datetime': 'Date',
      'timestamp': 'Date',
      'time': 'string',
      'interval': 'number',
      'binary': 'Buffer',
      'blob': 'Buffer',
      'json': 'object',
      'jsonb': 'object',
      'array': 'string[]',
      'uuid': 'string',
      'enum': 'string',
    };
    
    return map[type] || 'string';
  }
}

// ==================== 迁移生成器 ====================

export class MigrationGenerator {
  
  static generateMigration(
    from: DatabaseSchema,
    to: DatabaseSchema,
    name: string
  ): { up: string; down: string } {
    const up: string[] = [];
    const down: string[] = [];
    
    // 比较表
    const fromTables = new Set(from.tables.map(t => t.name));
    const toTables = new Set(to.tables.map(t => t.name));
    
    // 新增表
    for (const table of to.tables) {
      if (!fromTables.has(table.name)) {
        up.push(SchemaGenerator.generateSQLTable(table, 'postgresql'));
        down.push(`DROP TABLE "${table.name}";`);
      }
    }
    
    // 删除表
    for (const table of from.tables) {
      if (!toTables.has(table.name)) {
        down.push(SchemaGenerator.generateSQLTable(table, 'postgresql'));
        up.push(`DROP TABLE "${table.name}";`);
      }
    }
    
    return {
      up: up.join('\n\n'),
      down: down.join('\n\n'),
    };
  }
}
