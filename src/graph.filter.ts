import { Graph } from './graph.entity';
import { GraphTraversal, TraversalResult } from './graph.traversal';
import { GraphIndex } from './graph.index';
import { GraphNode, NormalizedEdge } from './types';
import { FILTERS } from './types';

interface TraversalStrategy {
  traverse(traversal: GraphTraversal, startNodes: Set<string>): TraversalResult;
}

const STRATEGIES: Record<string, TraversalStrategy> = {
  FORWARD_BFS: { traverse: (t, s) => t.bfs(s) },
  REVERSE_BFS: { traverse: (t, s) => t.bfsReverse(s) },
};

export abstract class BaseGraphFilter {
  abstract name: string;
  abstract strategy: TraversalStrategy;

  abstract matches(node: GraphNode): boolean;

  apply(
    traversal: GraphTraversal,
    graph: Graph,
    index: GraphIndex,
    subgraph?: Graph
  ): { nodes: GraphNode[]; edges: NormalizedEdge[] } {
    const startNodes = index.get(this.name);

    if (startNodes.size === 0) return { nodes: [], edges: [] };

    const targetGraph = subgraph ?? graph;
    const targetTraversal = subgraph ? new GraphTraversal(subgraph) : traversal;

    let validStartNodes = startNodes;
    if (subgraph) {
      validStartNodes = new Set(
        [...startNodes].filter(n => subgraph.hasNode(n))
      );
      if (validStartNodes.size === 0) return { nodes: [], edges: [] };
    }

    const result = this.strategy.traverse(targetTraversal, validStartNodes);
    return targetGraph.subgraph(result.visited);
  }
}

class PublicExposedFilter extends BaseGraphFilter {
  name = FILTERS.PUBLIC_EXPOSED;
  strategy = STRATEGIES.FORWARD_BFS;

  matches(node: GraphNode): boolean {
    return node.publicExposed === true;
  }
}

class SinkFilter extends BaseGraphFilter {
  name = FILTERS.SINK;
  strategy = STRATEGIES.REVERSE_BFS;

  matches(node: GraphNode): boolean {
    return node.kind === 'rds' || node.kind === 'sqs';
  }
}

class VulnerabilityFilter extends BaseGraphFilter {
  name = FILTERS.VULNERABILITY;
  strategy = STRATEGIES.FORWARD_BFS;

  matches(node: GraphNode): boolean {
    return !!node.vulnerabilities?.length;
  }
}

const filterRegistry = new Map<string, () => BaseGraphFilter>();

function registerFilter(name: string, factory: () => BaseGraphFilter) {
  filterRegistry.set(name, factory);
}

registerFilter(FILTERS.PUBLIC_EXPOSED, () => new PublicExposedFilter());
registerFilter(FILTERS.SINK, () => new SinkFilter());
registerFilter(FILTERS.VULNERABILITY, () => new VulnerabilityFilter());

export function createFilter(filterType: string): BaseGraphFilter {
  const factory = filterRegistry.get(filterType);

  if (!factory) {
    throw new Error(`Unknown filter type: ${filterType}`);
  }

  return factory();
}

export function getFilterRegistry(): Map<string, () => BaseGraphFilter> {
  return filterRegistry;
}

export function getAvailableFilters(): string[] {
  return [...filterRegistry.keys()];
}

