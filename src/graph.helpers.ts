import { NormalizedEdge } from "./types";

/**
 * Builds a Map from each source node to the Set of its target nodes.
 * Enables O(1) edge-existence checks by source + target without string concatenation.
 *
 * @param edges - Array of normalized edges
 * @returns Map where key = source node, value = Set of target nodes
 *
 * @example
 * const idx = indexEdges([{ from: 'A', to: 'B' }, { from: 'A', to: 'C' }]);
 * idx.get('A') // Set { 'B', 'C' }
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
 * Adds a value to a Set inside a Map, creating the Set if the key is missing.
 * Eliminates the repetitive has-check-then-get pattern.
 *
 * @param map - The Map to mutate
 * @param key - Key whose Set should receive the value
 * @param value - Value to add to the Set
 *
 * @example
 * const map = new Map<string, Set<string>>();
 * addToMapSet(map, 'A', 'B'); // { 'A' => Set { 'B' } }
 * addToMapSet(map, 'A', 'C'); // { 'A' => Set { 'B', 'C' } }
 */
export function addToMapSet<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
  let set = map.get(key);

  if (!set) {
    set = new Set();
    map.set(key, set);
  }

  set.add(value);
}