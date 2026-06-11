import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Graph } from '../src/graph.entity';
import { GraphTraversal } from '../src/graph.traversal';
import { GraphNode, NormalizedEdge } from '../src/types';

const nodes: GraphNode[] = [
  { name: 'A', kind: 'service', publicExposed: true },
  { name: 'B', kind: 'service' },
  { name: 'C', kind: 'rds' },
  { name: 'D', kind: 'service' },
  { name: 'E', kind: 'service' },
];

const edges: NormalizedEdge[] = [
  { from: 'A', to: 'B' },
  { from: 'A', to: 'C' },
  { from: 'B', to: 'D' },
  { from: 'C', to: 'D' },
  { from: 'D', to: 'E' },
];

function createTraversal(): GraphTraversal {
  const graph = new Graph(nodes, edges);
  return new GraphTraversal(graph);
}

describe('GraphTraversal', () => {
  describe('bfs', () => {
    it('should traverse from single start node forward', () => {
      const t = createTraversal();
      const result = t.bfs(new Set(['A']));
      assert.equal(result.visited.size, 5);
      assert.ok(result.visited.has('A'));
      assert.ok(result.visited.has('B'));
      assert.ok(result.visited.has('C'));
      assert.ok(result.visited.has('D'));
      assert.ok(result.visited.has('E'));
    });

    it('should start from multiple nodes', () => {
      const t = createTraversal();
      const result = t.bfs(new Set(['A', 'C']));
      assert.equal(result.visited.size, 5);
    });

    it('should ignore non-existent start nodes', () => {
      const t = createTraversal();
      const result = t.bfs(new Set(['Z']));
      assert.equal(result.visited.size, 0);
    });

    it('should visit nodes in BFS order (all parents before children)', () => {
      const t = createTraversal();
      const result = t.bfs(new Set(['A']));
      const indexA = result.order.indexOf('A');
      const indexB = result.order.indexOf('B');
      const indexC = result.order.indexOf('C');
      const indexD = result.order.indexOf('D');
      const indexE = result.order.indexOf('E');
      assert.ok(indexA < indexB);
      assert.ok(indexA < indexC);
      assert.ok(indexB < indexD);
      assert.ok(indexC < indexD);
      assert.ok(indexD < indexE);
    });
  });

  describe('bfsReverse', () => {
    it('should traverse from single start node backward', () => {
      const t = createTraversal();
      const result = t.bfsReverse(new Set(['E']));
      assert.equal(result.visited.size, 5);
      assert.ok(result.visited.has('A'));
      assert.ok(result.visited.has('E'));
    });

    it('should traverse from C (rds) backward to A only', () => {
      const t = createTraversal();
      const result = t.bfsReverse(new Set(['C']));
      assert.equal(result.visited.size, 2);
      assert.ok(result.visited.has('C'));
      assert.ok(result.visited.has('A'));
      assert.equal(result.visited.has('B'), false);
      assert.equal(result.visited.has('D'), false);
    });

    it('should ignore non-existent start nodes', () => {
      const t = createTraversal();
      const result = t.bfsReverse(new Set(['Z']));
      assert.equal(result.visited.size, 0);
    });
  });

  describe('dfs', () => {
    it('should traverse all reachable nodes', () => {
      const t = createTraversal();
      const result = t.dfs(new Set(['A']));
      assert.equal(result.visited.size, 5);
      assert.ok(result.visited.has('E'));
    });

    it('should ignore non-existent start nodes', () => {
      const t = createTraversal();
      const result = t.dfs(new Set(['Z']));
      assert.equal(result.visited.size, 0);
    });

    it('should handle cyclic graph without infinite loop', () => {
      const cyclicNodes: GraphNode[] = [
        { name: 'X', kind: 'service' },
        { name: 'Y', kind: 'service' },
        { name: 'Z', kind: 'service' },
      ];
      const cyclicEdges: NormalizedEdge[] = [
        { from: 'X', to: 'Y' },
        { from: 'Y', to: 'Z' },
        { from: 'Z', to: 'X' },
      ];
      const graph = new Graph(cyclicNodes, cyclicEdges);
      const t = new GraphTraversal(graph);
      const result = t.dfs(new Set(['X']));
      assert.equal(result.visited.size, 3);
    });
  });
});
