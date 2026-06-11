import { Graph } from './graph.entity';

export interface TraversalResult {
  visited: Set<string>;
  order: string[];
}

export class GraphTraversal {
  constructor(private graph: Graph) {}

  bfs(startNodes: Set<string>): TraversalResult {
    const visited = new Set<string>();
    const order: string[] = [];
    const queue: string[] = [];

    startNodes.forEach(node => {
      if (this.graph.hasNode(node)) {
        visited.add(node);
        order.push(node);
        queue.push(node);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;

      this.graph.getNeighbors(current).forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          order.push(neighbor);
          queue.push(neighbor);
        }
      });
    }

    return { visited, order };
  }

  bfsReverse(startNodes: Set<string>): TraversalResult {
    const visited = new Set<string>();
    const order: string[] = [];
    const queue: string[] = [];

    startNodes.forEach(node => {
      if (this.graph.hasNode(node)) {
        visited.add(node);
        order.push(node);
        queue.push(node);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;

      this.graph.getParents(current).forEach(parent => {
        if (!visited.has(parent)) {
          visited.add(parent);
          order.push(parent);
          queue.push(parent);
        }
      });
    }

    return { visited, order };
  }

  dfs(startNodes: Set<string>): TraversalResult {
    const visited = new Set<string>();
    const order: string[] = [];
    const stack: string[] = [];

    startNodes.forEach(node => {
      if (this.graph.hasNode(node)) {
        stack.push(node);
      }
    });

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;

      visited.add(current);
      order.push(current);

      const neighbors = this.graph.getNeighbors(current);
      const neighborArray = [...neighbors];
      for (let i = neighborArray.length - 1; i >= 0; i--) {
        const neighbor = neighborArray[i];
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }

    return { visited, order };
  }
}