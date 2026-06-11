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

    const processQueue = () => {
      if (queue.length === 0) return;

      const current = queue.shift()!;

      this.graph.getNeighbors(current).forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          order.push(neighbor);
          queue.push(neighbor);
        }
      });

      processQueue();
    };

    processQueue();

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

    const processQueue = () => {
      if (queue.length === 0) return;

      const current = queue.shift()!;

      this.graph.getParents(current).forEach(parent => {
        if (!visited.has(parent)) {
          visited.add(parent);
          order.push(parent);
          queue.push(parent);
        }
      });

      processQueue();
    };

    processQueue();

    return { visited, order };
  }

  dfs(startNodes: Set<string>): TraversalResult {
    const visited = new Set<string>();
    const order: string[] = [];

    const dfsInner = (node: string) => {
      if (visited.has(node)) return;

      visited.add(node);
      order.push(node);

      this.graph.getNeighbors(node).forEach(neighbor => dfsInner(neighbor));
    };

    startNodes.forEach(node => {
      if (this.graph.hasNode(node)) {
        dfsInner(node);
      }
    });

    return { visited, order };
  }
}