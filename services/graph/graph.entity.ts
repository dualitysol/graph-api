import { GraphNode, NormalizedEdge } from './types';

export class Graph {
  private nodes: Map<string, GraphNode>;
  private outgoing: Map<string, Set<string>>;
  private incoming: Map<string, Set<string>>;
  private cachedNodes: GraphNode[];

  constructor(nodes: GraphNode[], edges: NormalizedEdge[]) {
    this.nodes = new Map(nodes.map((n) => [n.name, n]));
    this.outgoing = new Map();
    this.incoming = new Map();
    this.cachedNodes = nodes;

    edges.forEach((edge) => {
      if (!this.outgoing.has(edge.from)) {
        this.outgoing.set(edge.from, new Set());
      }
      this.outgoing.get(edge.from)!.add(edge.to);

      if (!this.incoming.has(edge.to)) {
        this.incoming.set(edge.to, new Set());
      }
      this.incoming.get(edge.to)!.add(edge.from);
    });
  }

  getNode(name: string): GraphNode | undefined {
    return this.nodes.get(name);
  }

  getNodes(): GraphNode[] {
    return this.cachedNodes;
  }

  getNeighbors(name: string): Set<string> {
    return this.outgoing.get(name) ?? new Set();
  }

  getParents(name: string): Set<string> {
    return this.incoming.get(name) ?? new Set();
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

    this.outgoing.forEach((tos, from) => {
      if (nodeNames.has(from)) {
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

