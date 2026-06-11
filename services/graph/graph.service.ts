import { Graph } from './graph.entity';
import { GraphTraversal } from './graph.traversal';
import { GraphIndex } from './graph.index';
import { createFilter } from './filters/graph.filter';
import { GraphLoader } from './graph.loader';
import { GraphNode, NormalizedEdge } from './types';

export type QueryMode = 'chain' | 'intersect';

export class GraphService {
  private graph: Graph;
  private traversal: GraphTraversal;
  private index: GraphIndex;

  constructor() {
    const loader = GraphLoader.getInstance();
    const rawGraph = loader.getGraph();
    const edges = loader.getNormalizedEdges();
    this.graph = new Graph(rawGraph.nodes, edges);
    this.traversal = new GraphTraversal(this.graph);
    this.index = new GraphIndex();
    this.index.build(rawGraph.nodes);
  }

  queryGraph(
    filterTypes: string[] = [],
    mode: QueryMode = 'chain'
  ): { nodes: GraphNode[]; edges: NormalizedEdge[] } {
    if (filterTypes.length === 0) {
      return {
        nodes: this.graph.getNodes(),
        edges: this.graph.getAllEdges(),
      };
    }

    if (mode === 'chain') {
      return this.applyChain(filterTypes);
    }

    return this.applyIntersect(filterTypes);
  }

  private applyChain(filterTypes: string[]): { nodes: GraphNode[]; edges: NormalizedEdge[] } {
    let currentSubgraph: { nodes: GraphNode[]; edges: NormalizedEdge[] } | null = null;

    filterTypes.forEach(filterType => {
      const filter = createFilter(filterType);

      if (currentSubgraph === null) {
        currentSubgraph = filter.apply(this.traversal, this.graph, this.index);
      } else {
        const subgraphGraph = new Graph(currentSubgraph.nodes, currentSubgraph.edges);
        const subgraphTraversal = new GraphTraversal(subgraphGraph);
        currentSubgraph = filter.apply(subgraphTraversal, subgraphGraph, this.index, subgraphGraph);
      }
    });

    return currentSubgraph!;
  }

  private applyIntersect(filterTypes: string[]): { nodes: GraphNode[]; edges: NormalizedEdge[] } {
    let result: { nodes: GraphNode[]; edges: NormalizedEdge[] } | null = null;

    filterTypes.forEach(filterType => {
      const filter = createFilter(filterType);
      const subgraphResult = filter.apply(this.traversal, this.graph, this.index);

      if (result === null) {
        result = subgraphResult;
      } else {
        const nodeNames = new Set(result.nodes.map(n => n.name));
        const edgeKeys = new Set(result.edges.map(e => `${e.from}->${e.to}`));

        result = {
          nodes: subgraphResult.nodes.filter(n => nodeNames.has(n.name)),
          edges: subgraphResult.edges.filter(e => edgeKeys.has(`${e.from}->${e.to}`)),
        };
      }
    });

    return result!;
  }
}

export const graphService = new GraphService();