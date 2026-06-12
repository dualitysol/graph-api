import fs from 'fs';
import path from 'path';
import { Graph } from './graph.entity';
import { RawGraph, NormalizedEdge } from './types';

/**
 * Creates a Graph from a JSON file by parsing, validating, and normalizing edges.
 * No singleton — pure factory.
 */
export class GraphLoader {
  /**
   * Read, parse, and construct a Graph from a JSON file.
   */
  static load(filePath: string): Graph {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const rawData = fs.readFileSync(absolutePath, 'utf-8');
    const raw: RawGraph = JSON.parse(rawData);

    const normalizedEdges = GraphLoader.normalizeEdges(raw.edges);
    return new Graph(raw.nodes, normalizedEdges);
  }

  private static normalizeEdges(edges: RawGraph['edges']): NormalizedEdge[] {
    const result: NormalizedEdge[] = [];
    for (const edge of edges) {
      const toArray = Array.isArray(edge.to) ? edge.to : [edge.to];
      for (const to of toArray) {
        result.push({ from: edge.from, to });
      }
    }
    return result;
  }
}
