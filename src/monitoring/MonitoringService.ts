/**
 * Monitoring Service
 * 
 * 监控和分析服务，支持：
 * - 性能监控 (APM)
 * - 日志聚合
 * - 指标收集
 * - 告警配置
 * - 分布式追踪
 */

// ==================== 类型定义 ====================

export interface MonitoringConfig {
  provider: MonitoringProvider;
  environment: 'dev' | 'staging' | 'production';
  services: MonitoredService[];
  alerts: AlertRule[];
  dashboards: Dashboard[];
}

export type MonitoringProvider = 'datadog' | 'prometheus' | 'grafana' | 'sentry' | 'newrelic' | 'cloudwatch';

export interface MonitoredService {
  name: string;
  type: 'api' | 'web' | 'worker' | 'database' | 'cache';
  endpoints?: string[];
  metrics: Metric[];
}

export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels?: Record<string, string>;
  help?: string;
}

export interface AlertRule {
  name: string;
  condition: AlertCondition;
  severity: 'info' | 'warning' | 'critical';
  duration: string; // e.g., "5m", "1h"
  actions: AlertAction[];
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  for: string; // duration
}

export interface AlertAction {
  type: 'email' | 'slack' | 'pagerduty' | 'webhook' | 'teams';
  config: Record<string, string>;
}

export interface Dashboard {
  name: string;
  panels: DashboardPanel[];
  refresh?: string; // e.g., "30s", "1m"
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'graph' | 'stat' | 'table' | 'logs' | 'alert' | 'gauge';
  query: string;
  width?: number;
  height?: number;
  options?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  timestamp: Date;
  service: string;
  latency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  throughput: number;
  errorRate: number;
  resourceUsage: {
    cpu: number; // percentage
    memory: number; // percentage
    disk: number; // percentage
  };
}

export interface TraceSpan {
  id: string;
  traceId: string;
  parentId?: string;
  name: string;
  startTime: number; // epoch nanoseconds
  duration: number; // nanoseconds
  attributes: Record<string, unknown>;
  events: SpanEvent[];
  links?: SpanLink[];
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

export interface SpanLink {
  traceId: string;
  spanId: string;
}

// ==================== Prometheus Generator ====================

export class PrometheusGenerator {
  
  /**
   * 生成 Prometheus 配置 (prometheus.yml)
   */
  static generateConfig(config: MonitoringConfig): string {
    const parts: string[] = [
      'global:',
      '  scrape_interval: 15s',
      '  evaluation_interval: 15s',
      '',
      'alerting:',
      '  alertmanagers:',
      '    - static_configs:',
      '        - targets:',
      '          - localhost:9093',
      '',
      'rule_files:',
      '  - "alert_rules.yml"',
      '',
      'scrape_configs:',
      '  - job_name: "prometheus"',
      '    static_configs:',
      '      - targets:',
      '          - localhost:9090',
    ];
    
    for (const service of config.services) {
      parts.push(this.generateServiceScrapeConfig(service));
    }
    
    return parts.join('\n');
  }
  
  private static generateServiceScrapeConfig(service: MonitoredService): string {
    return `
  - job_name: "${service.name}"
    static_configs:
      - targets:
          - localhost:8080
    metrics_path: /metrics
    scheme: http`;
  }
  
  /**
   * 生成 AlertManager 配置
   */
  static generateAlertManagerConfig(config: MonitoringConfig): string {
    const parts: string[] = [
      'route:',
      '  receiver: "default"',
      '  group_by: ["alertname"]',
      '  group_wait: 30s',
      '  group_interval: 5m',
      '  repeat_interval: 4h',
      '  routes:',
      '    - match:',
      '        severity: critical',
      '      receiver: "critical-alerts"',
      '    - match:',
      '        severity: warning',
      '      receiver: "warning-alerts"',
      '',
      'receivers:',
      '  - name: "default"',
      '    webhook_configs:',
      '      - url: "http://localhost:5000/webhook"',
      '',
      '  - name: "critical-alerts"',
      '    email_configs:',
      '      - to: "ops@example.com"',
      '        subject: "Critical Alert: {{ .GroupLabels.alertname }}"',
      '        body: "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}"',
      '',
      '  - name: "warning-alerts"',
      '    slack_configs:',
      '      - api_url: "https://hooks.slack.com/services/xxx"',
      '        channel: "#alerts"',
    ];
    
    return parts.join('\n');
  }
  
  /**
   * 生成告警规则 (alert_rules.yml)
   */
  static generateAlertRules(config: MonitoringConfig): string {
    const parts: string[] = [
      'groups:',
      '  - name: service_alerts',
      '    rules:',
    ];
    
    for (const rule of config.alerts) {
      parts.push(this.generateAlertRule(rule));
    }
    
    return parts.join('\n');
  }
  
  private static generateAlertRule(rule: AlertRule): string {
    const duration = rule.duration || '5m';
    return `
      - alert: ${rule.name}
        expr: ${rule.condition.metric} ${rule.condition.operator} ${rule.condition.value}
        for: ${duration}
        labels:
          severity: ${rule.severity}
        annotations:
          summary: "${rule.name} triggered"
          description: "Metric {{ ${rule.condition.metric} }} is {{ ${rule.condition.operator} }} {{ ${rule.condition.value} }} for more than ${duration}"
`;
  }
  
  /**
   * 生成 Grafana Dashboard (JSON)
   */
  static generateGrafanaDashboard(dashboard: Dashboard): string {
    const panels = dashboard.panels.map((panel, index) => ({
      id: panel.id,
      title: panel.title,
      type: this.mapPanelType(panel.type),
      gridPos: {
        h: panel.height || 8,
        w: panel.width || 12,
        x: 0,
        y: index * 8,
      },
      targets: [{
        expr: panel.query,
        legendFormat: '__auto',
        refId: 'A',
      }],
      ...panel.options,
    }));
    
    const dashboardJson = {
      annotations: {
        list: [],
      },
      editable: true,
      graphTooltip: 0,
      id: null,
      links: [],
      panels,
      schemaVersion: 39,
      tags: [dashboard.name],
      templating: {
        list: [],
      },
      time: {
        from: 'now-6h',
        to: 'now',
      },
      timepicker: {},
      timezone: '',
      title: dashboard.name,
      uid: this.generateUID(),
      version: 1,
    };
    
    return JSON.stringify(dashboardJson, null, 2);
  }
  
  private static mapPanelType(type: DashboardPanel['type']): string {
    const map: Record<string, string> = {
      'graph': 'graph',
      'stat': 'stat',
      'table': 'table',
      'logs': 'logs',
      'alert': 'alert',
      'gauge': 'gauge',
    };
    return map[type] || 'graph';
  }
  
  private static generateUID(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// ==================== OpenTelemetry Generator ====================

export class OpenTelemetryGenerator {
  
  /**
   * 生成 OpenTelemetry Collector 配置
   */
  static generateCollectorConfig(config: MonitoringConfig): string {
    return `receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
  memory_limiter:
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  prometheus:
    endpoint: 0.0.0.0:9090
  otlp:
    endpoint: localhost:4317
    tls:
      insecure: true
  debug:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus, otlp]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
`;
  }
  
  /**
   * 生成 Node.js 应用集成代码
   */
  static generateNodeIntegration(serviceName: string): string {
    return `
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: '${serviceName}',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  metricExporter: new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  logExporter: new OTLPLogExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
});

// Initialize the SDK and register with the OpenTelemetry APIs
sdk.start();

console.log('OpenTelemetry SDK started');

// gracefully shutdown the SDK on process exit
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('SDK shutdown'))
    .catch((error) => console.log('Error shutting down SDK', error))
    .finally(() => process.exit(0));
});
`;
  }
  
  /**
   * 生成 Python 应用集成代码
   */
  static generatePythonIntegration(serviceName: string): string {
    return `
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Initialize tracer provider
tracer_provider = TracerProvider(
    resource=Resource.create({
        "service.name": "${serviceName}",
    })
)

# Export traces to OTLP endpoint
exporter = OTLPSpanExporter(
    endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318/v1/traces"),
)

# Add batch processor
tracer_provider.add_span_processor(BatchSpanProcessor(exporter))

# Set global tracer provider
trace.set_tracer_provider(tracer_provider)

# Instrument libraries
FastAPIInstrumentor().instrument()
HTTPXClientInstrumentor().instrument()
SQLAlchemyInstrumentor().instrument()

print("OpenTelemetry SDK initialized")
`;
  }
}

// ==================== 指标收集器 ====================

export class MetricsCollector {
  
  private metrics: PerformanceMetrics[] = [];
  
  /**
   * 记录性能指标
   */
  record(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
  }
  
  /**
   * 获取最近的指标
   */
  getRecent(duration: number): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - duration);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }
  
  /**
   * 计算统计信息
   */
  getStatistics(service: string, duration: number): PerformanceMetrics | null {
    const recent = this.getRecent(duration)
      .filter(m => m.service === service);
    
    if (recent.length === 0) return null;
    
    const latencies = recent.map(m => m.latency);
    
    return {
      timestamp: new Date(),
      service,
      latency: {
        p50: this.percentile(latencies.map(l => l.p50), 50),
        p95: this.percentile(latencies.map(l => l.p95), 95),
        p99: this.percentile(latencies.map(l => l.p99), 99),
        avg: latencies.reduce((sum, l) => sum + l.avg, 0) / latencies.length,
      },
      throughput: recent.reduce((sum, m) => sum + m.throughput, 0) / recent.length,
      errorRate: recent.reduce((sum, m) => sum + m.errorRate, 0) / recent.length,
      resourceUsage: {
        cpu: recent.reduce((sum, m) => sum + m.resourceUsage.cpu, 0) / recent.length,
        memory: recent.reduce((sum, m) => sum + m.resourceUsage.memory, 0) / recent.length,
        disk: recent.reduce((sum, m) => sum + m.resourceUsage.disk, 0) / recent.length,
      },
    };
  }
  
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p / 100) - 1;
    return sorted[Math.max(0, index)];
  }
}

// ==================== 日志聚合器 ====================

export class LogAggregator {
  
  private logs: LogEntry[] = [];
  
  /**
   * 添加日志条目
   */
  add(entry: LogEntry): void {
    this.logs.push(entry);
  }
  
  /**
   * 搜索日志
   */
  search(query: LogQuery): LogEntry[] {
    return this.logs.filter(log => {
      if (query.level && log.level !== query.level) return false;
      if (query.service && log.service !== query.service) return false;
      if (query.message && !log.message.includes(query.message)) return false;
      if (query.startTime && log.timestamp < query.startTime) return false;
      if (query.endTime && log.timestamp > query.endTime) return false;
      return true;
    });
  }
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service: string;
  message: string;
  traceId?: string;
  spanId?: string;
  attributes?: Record<string, unknown>;
}

export interface LogQuery {
  level?: LogEntry['level'];
  service?: string;
  message?: string;
  traceId?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}
