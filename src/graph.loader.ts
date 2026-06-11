import fs from 'fs';
import path from 'path';
import { RawGraph, NormalizedEdge, GraphNode } from './types';

export class GraphLoader {
  private static instance: GraphLoader;
  private graph: RawGraph | null = null;
  private normalizedEdges: NormalizedEdge[] | null = null;

  private constructor() {}
 /**
  * Returns the singleton instance of GraphLoader in case if several services would refer to this to avoid multiple instqance creation
  * @returns {GraphLoader} singleton instance
  */
  public static getInstance(): GraphLoader {
    if (!GraphLoader.instance) {
      GraphLoader.instance = new GraphLoader();
    }
    return GraphLoader.instance;
  }

  /** Reset the singleton (for testing purposes). */
  public static resetInstance(): void {
    GraphLoader.instance = null;
  }

  public loadGraph(filePath: string): RawGraph {
    if (this.graph) {
      return this.graph;
    }

    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const rawData = fs.readFileSync(absolutePath, 'utf-8');
    this.graph = JSON.parse(rawData) as RawGraph;
    return this.graph;
  }

  public getGraph(): RawGraph {
    if (!this.graph) {
      throw new Error('Graph not loaded. Call loadGraph() first.');
    }
    return this.graph;
  }

  public getNormalizedEdges(): NormalizedEdge[] {
    if (!this.normalizedEdges) {
      if (!this.graph) {
        throw new Error('Graph not loaded. Call loadGraph() first.');
      }
      this.normalizedEdges = this.normalizeEdges(this.graph.edges);
    }
    return this.normalizedEdges;
  }

  private normalizeEdges(edges: any[]): NormalizedEdge[] {
    const normalized: NormalizedEdge[] = [];
    for (const edge of edges) {
      const toArray = Array.isArray(edge.to) ? edge.to : [edge.to];
      for (const to of toArray) {
        normalized.push({ from: edge.from, to });
      }
    }
    return normalized;
  }

  public getNodeMap(): Map<string, GraphNode> {
    if (!this.graph) {
      throw new Error('Graph not loaded. Call loadGraph() first.');
    }
    const map = new Map<string, GraphNode>();
    for (const node of this.graph.nodes) {
      map.set(node.name, node);
    }
    return map;
  }
}
