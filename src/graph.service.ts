import { Graph } from './graph.entity';
import { GraphTraversal } from './graph.traversal';
import { GraphIndex } from './graph.index';
import { createFilter } from './graph.filter';
import { GraphNode, NormalizedEdge } from './types';
import { indexEdges, buildNestedGraph } from './graph.helpers';
import { GraphQueryResponse, QueryMode } from '../packages/dto/types';

export class GraphService {
  private graph: Graph;
  private traversal: GraphTraversal;
  private index: GraphIndex;

  constructor(graph: Graph) {
    this.graph = graph;
    this.traversal = new GraphTraversal(this.graph);
    this.index = new GraphIndex();
    this.index.build(graph.getNodes());
  }

  queryGraph(filterTypes: string[] = [], mode: QueryMode = 'chain'): GraphQueryResponse {
    let nodes: GraphNode[];
    let edges: NormalizedEdge[];

    if (filterTypes.length === 0) {
      nodes = this.graph.getNodes();
      edges = this.graph.getAllEdges();
    } else if (mode === 'chain') {
      const result = this.applyChain(filterTypes);
      nodes = result.nodes;
      edges = result.edges;
    } else {
      const result = this.applyIntersect(filterTypes);
      nodes = result.nodes;
      edges = result.edges;
    }

    const nested = buildNestedGraph(nodes, edges);
    return {
      levels: nested.levels,
      meta: {
        filters: filterTypes,
        mode,
      },
    };
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
        // Index is not needed here — filter.apply() uses subgraph to filter startNodes
        // from the original index via subgraph.hasNode() internally
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
        const edgeIndex = indexEdges(result.edges);

        result = {
          nodes: subgraphResult.nodes.filter(n => nodeNames.has(n.name)),
          edges: subgraphResult.edges.filter(e => {
            const targets = edgeIndex.get(e.from);
            return targets !== undefined && targets.has(e.to);
          }),
        };
      }
    });

    return result!;
  }
}
