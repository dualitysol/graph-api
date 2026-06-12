import { GraphNode, NormalizedEdge } from './types';

export class Graph {
  private nodes: Map<string, GraphNode>;
  private outgoing: Map<string, Set<string>>;
  private incoming: Map<string, Set<string>>;
  private cachedNodes: GraphNode[];
  private allEdges: NormalizedEdge[];

  private static readonly EMPTY_SET = Object.freeze(new Set<string>());

  constructor(nodes: GraphNode[], edges: NormalizedEdge[]) {
    this.nodes = new Map();
    this.outgoing = new Map();
    this.incoming = new Map();
    this.cachedNodes = nodes;
    this.allEdges = edges;

    for (const node of nodes) {
      this.nodes.set(node.name, node);
      this.outgoing.set(node.name, new Set());
      this.incoming.set(node.name, new Set());
    }

    for (const edge of edges) {
      if (!this.nodes.has(edge.from)) {
        console.warn(`[Graph] Broken edge: source "${edge.from}" not found among nodes`);
        continue;
      }
      if (!this.nodes.has(edge.to)) {
        console.warn(
          `[Graph] Broken edge: target "${edge.to}" not found among nodes (edge: ${edge.from} -> ${edge.to})`,
        );
        continue;
      }

      this.outgoing.get(edge.from)!.add(edge.to);
      this.incoming.get(edge.to)!.add(edge.from);
    }

    // Log isolated nodes — needs edges populated, so must be a separate pass
    for (const node of nodes) {
      const hasOutgoing = this.outgoing.get(node.name)!.size > 0;
      const hasIncoming = this.incoming.get(node.name)!.size > 0;
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

  getNeighbors(name: string): ReadonlySet<string> {
    return this.outgoing.get(name) ?? Graph.EMPTY_SET;
  }

  getParents(name: string): ReadonlySet<string> {
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
