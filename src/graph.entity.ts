import { GraphNode, NormalizedEdge } from './types';
import { addToMapSet } from './graph.helpers';

export class Graph {
  private nodes: Map<string, GraphNode>;
  private outgoing: Map<string, Set<string>>;
  private incoming: Map<string, Set<string>>;
  private cachedNodes: GraphNode[];
  private allEdges: NormalizedEdge[];

  private static readonly EMPTY_SET = new Set<string>();

  constructor(nodes: GraphNode[], edges: NormalizedEdge[]) {
    this.nodes = new Map(nodes.map((n) => [n.name, n]));
    this.outgoing = new Map();
    this.incoming = new Map();
    this.cachedNodes = nodes;
    this.allEdges = edges;

    for (const edge of edges) {
      if (!this.nodes.has(edge.from)) {
        console.warn(`[Graph] Broken edge: source "${edge.from}" not found among nodes`);
        continue;
      }
      if (!this.nodes.has(edge.to)) {
        console.warn(`[Graph] Broken edge: target "${edge.to}" not found among nodes (edge: ${edge.from} -> ${edge.to})`);
        continue;
      }
      addToMapSet(this.outgoing, edge.from, edge.to);
      addToMapSet(this.incoming, edge.to, edge.from);
    }

    // Log isolated nodes (no incoming or outgoing edges)
    for (const node of nodes) {
      const hasOutgoing = this.outgoing.has(node.name);
      const hasIncoming = this.incoming.has(node.name);
      if (!hasOutgoing && !hasIncoming) {
        console.warn(`[Graph] Isolated node: "${node.name}" has no edges`);
      }
    }
  }

  getNode(name: string): GraphNode | undefined {
    return this.nodes.get(name);
  }

  getNodes(): GraphNode[] {
    return this.cachedNodes;
  }

  getAllEdges(): NormalizedEdge[] {
    return this.allEdges;
  }

  getNeighbors(name: string): Set<string> {
    return this.outgoing.get(name) ?? Graph.EMPTY_SET;
  }

  getParents(name: string): Set<string> {
    return this.incoming.get(name) ?? Graph.EMPTY_SET;
  }

  hasNode(name: string): boolean {
    return this.nodes.has(name);
  }

  subgraph(nodeNames: Set<string>): { nodes: GraphNode[]; edges: NormalizedEdge[] } {
    const nodes: GraphNode[] = [];
    const edges: NormalizedEdge[] = [];

    nodeNames.forEach(name => {
      const node = this.nodes.get(name);
      if (node) {
        nodes.push(node);
      }
    });

    nodeNames.forEach(from => {
      const tos = this.outgoing.get(from);
      if (tos) {
        tos.forEach(to => {
          if (nodeNames.has(to)) {
            edges.push({ from, to });
          }
        });
      }
    });

    return { nodes, edges };
  }
}

