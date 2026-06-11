import { GraphNode } from './types';
import { getFilterRegistry } from './graph.filter';

export class GraphIndex {
  private indexes = new Map<string, Set<string>>();

  build(nodes: GraphNode[]) {
    const registry = getFilterRegistry();

    registry.forEach((factory, name) => {
      const filter = factory();
      const set = new Set<string>();

      nodes.forEach(node => {
        if (filter.matches(node)) {
          set.add(node.name);
        }
      });

      this.indexes.set(name, set);
    });
  }

  get(filterType: string): Set<string> {
    return this.indexes.get(filterType) ?? new Set();
  }
}