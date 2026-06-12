import { GraphNode, NormalizedEdge } from './types';
import { NestedGraphNode, NestedGraph, NestedGraphLevel } from '../packages/dto/types';

/**
 * Index edges as Map<from, Set<to>> for O(1) lookups.
 */
export function indexEdges(edges: NormalizedEdge[]): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();

  for (const { from, to } of edges) {
    const targets = index.get(from);
    if (targets) {
      targets.add(to);
    } else {
      index.set(from, new Set([to]));
    }
  }

  return index;
}

/**
 * Adds a value to a Set inside a Map, creating the Set if missing.
 */
export function addToMapSet<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(value);
}

/**
 * Builds a nested (layered) graph from a flat node/edge result.
 * Arranges nodes into BFS levels so frontend can render top-to-bottom.
 *
 * @param nodes - Flat array of graph nodes
 * @param edges - Flat array of normalized edges
 * @returns NestedGraph with levels
 */
export function buildNestedGraph(nodes: GraphNode[], edges: NormalizedEdge[]): NestedGraph {
  // Index edges for fast lookup
  const edgeIndex = indexEdges(edges);

  // Reverse index: who points to whom
  const reverseIndex = new Map<string, Set<string>>();
  for (const { from, to } of edges) {
    addToMapSet(reverseIndex, to, from);
  }

  // Build node map and subgraph set in a single pass
  const nodeMap = new Map<string, GraphNode>();
  const allInSubgraph = new Set<string>();
  for (const node of nodes) {
    nodeMap.set(node.name, node);
    allInSubgraph.add(node.name);
  }

  // Find roots: nodes with no incoming edges within this subgraph
  const roots: string[] = [];
  for (const name of allInSubgraph) {
    const parents = reverseIndex.get(name);
    if (!parents) {
      roots.push(name);
    } else {
      let hasParentInSubgraph = false;
      for (const p of parents) {
        if (allInSubgraph.has(p)) {
          hasParentInSubgraph = true;
          break;
        }
      }
      if (!hasParentInSubgraph) {
        roots.push(name);
      }
    }
  }
  // BFS to assign levels
  const levelMap = new Map<string, number>();
  const queue: string[] = [];

  for (const root of roots) {
    levelMap.set(root, 0);
    queue.push(root);
  }

  // If no roots found (e.g. cycles), put all at level 0
  if (roots.length === 0 && allInSubgraph.size > 0) {
    for (const name of allInSubgraph) {
      levelMap.set(name, 0);
      queue.push(name);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const currentLevel = levelMap.get(current) ?? 0;
    const neighbors = edgeIndex.get(current);

    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!allInSubgraph.has(neighbor)) continue;
        if (!levelMap.has(neighbor)) {
          levelMap.set(neighbor, currentLevel + 1);
          queue.push(neighbor);
        }
      }
    }
  }

  // Build level groups
  const levelGroups = new Map<number, Record<string, NestedGraphNode>>();

  for (const [name, level] of levelMap) {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, {});
    }

    const node = nodeMap.get(name)!;
    const neighbors = [...(edgeIndex.get(name) ?? [])].filter(n => allInSubgraph.has(n));
    const children = neighbors.filter(n => (levelMap.get(n) ?? 0) > level);

    const nestedNode: NestedGraphNode = {
      name: node.name,
      kind: node.kind,
      language: node.language,
      publicExposed: node.publicExposed,
      vulnerabilities: node.vulnerabilities?.map(v => ({
        file: v.file,
        severity: v.severity,
        message: v.message,
        metadata: v.metadata,
      })),
      neighbors,
      children,
    };

    levelGroups.get(level)![name] = nestedNode;
  }

  const levels: NestedGraphLevel[] = [];
  const sortedLevels = [...levelGroups.keys()].sort((a, b) => a - b);
  for (const level of sortedLevels) {
    levels.push({ level, nodes: levelGroups.get(level)! });
  }

  return { levels };
}
