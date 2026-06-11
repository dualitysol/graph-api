export interface Metadata {
  cwe?: string;
  cloud?: string;
  engine?: string;
  version?: string;
  [key: string]: any;
}

export interface Vulnerability {
  file: string;
  severity: string;
  message: string;
  metadata?: Metadata;
}

export interface GraphNode {
  name: string;
  kind: string;
  language?: string;
  path?: string;
  publicExposed?: boolean;
  vulnerabilities?: Vulnerability[];
  metadata?: Metadata;
}

export interface GraphEdge {
  from: string;
  to: string | string[];
}

export interface RawGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface NormalizedEdge {
  from: string;
  to: string;
}

export interface GraphApiResponse {
  nodes: GraphNode[];
  edges: NormalizedEdge[];
  timestamp?: number;
  cached?: boolean;
}

export const FILTERS = {
  PUBLIC_EXPOSED: 'publicExposed',
  SINK: 'sink',
  VULNERABILITY: 'vulnerability',
} as const;
