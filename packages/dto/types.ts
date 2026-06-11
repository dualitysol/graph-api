// Common DTO and type definitions shared across the application

export interface FilterRequest {
  type: string;
  [key: string]: any;
}

export interface QueryRequest {
  filters?: FilterRequest[];
}

export interface ApiResponse {
  nodes: any[];
  edges: any[];
  timestamp?: number;
  cached?: boolean;
}

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: number;
}
