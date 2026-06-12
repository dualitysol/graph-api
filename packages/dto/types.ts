export interface VulnerabilityInfo {
  file: string;
  severity: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NestedGraphNode {
  name: string;
  kind: string;
  language?: string;
  publicExposed?: boolean;
  vulnerabilities?: VulnerabilityInfo[];
  neighbors: string[];
  children: string[];
}

export interface NestedGraphLevel {
  level: number;
  nodes: Record<string, NestedGraphNode>;
}

export interface NestedGraph {
  levels: NestedGraphLevel[];
}

export type QueryMode = 'chain' | 'intersect';

export interface GraphQueryMeta {
  filters: string[];
  mode: QueryMode;
}

export interface GraphQueryResponse {
  levels: NestedGraphLevel[];
  meta?: GraphQueryMeta;
}

export interface ErrorResponse {
  error: string;
  message: string;
}
