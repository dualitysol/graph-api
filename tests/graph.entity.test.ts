import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Graph } from '../src/graph.entity';
import { GraphNode, NormalizedEdge } from '../src/types';

const createNode = (name: string, overrides: Partial<GraphNode> = {}): GraphNode => ({
  name,
  kind: 'service',
  ...overrides,
});

const nodes: GraphNode[] = [
  createNode('A', { publicExposed: true }),
  createNode('B'),
  createNode('C', { kind: 'rds' }),
  createNode('D'),
  createNode('E', { vulnerabilities: [{ file: 'x.ts', severity: 'high', message: 'sql injection' }] }),
];

const edges: NormalizedEdge[] = [
  { from: 'A', to: 'B' },
  { from: 'B', to: 'C' },
  { from: 'B', to: 'D' },
  { from: 'D', to: 'E' },
];

describe('Graph', () => {
  describe('constructor', () => {
    it('should create graph with nodes and edges', () => {
      const graph = new Graph(nodes, edges);
      assert.equal(graph.getNodes().length, 5);
      assert.equal(graph.getAllEdges().length, 4);
    });

    it('should build outgoing and incoming maps', () => {
      const graph = new Graph(nodes, edges);
      assert.deepEqual([...graph.getNeighbors('A')], ['B']);
      assert.deepEqual([...graph.getNeighbors('B')], ['C', 'D']);
      assert.deepEqual([...graph.getParents('C')], ['B']);
      assert.deepEqual([...graph.getParents('B')], ['A']);
    });
  });

  describe('getNode', () => {
    it('should return node by name', () => {
      const graph = new Graph(nodes, edges);
      const node = graph.getNode('A');
      assert.ok(node);
      assert.equal(node!.name, 'A');
    });

    it('should return undefined for missing node', () => {
      const graph = new Graph(nodes, edges);
      assert.equal(graph.getNode('Z'), undefined);
    });
  });

  describe('getNodes', () => {
    it('should return all nodes', () => {
      const graph = new Graph(nodes, edges);
      const result = graph.getNodes();
      assert.equal(result.length, 5);
      assert.ok(result.includes(nodes[0]));
    });

    it('should return cached array', () => {
      const graph = new Graph(nodes, edges);
      assert.equal(graph.getNodes(), graph.getNodes());
    });
  });

  describe('hasNode', () => {
    it('should return true for existing node', () => {
      const graph = new Graph(nodes, edges);
      assert.ok(graph.hasNode('A'));
    });

    it('should return false for missing node', () => {
      const graph = new Graph(nodes, edges);
      assert.equal(graph.hasNode('Z'), false);
    });
  });

  describe('subgraph', () => {
    it('should return subgraph with specified nodes and edges between them', () => {
      const graph = new Graph(nodes, edges);
      const result = graph.subgraph(new Set(['A', 'B', 'C']));
      assert.equal(result.nodes.length, 3);
      assert.equal(result.edges.length, 2);
      assert.ok(result.edges.some(e => e.from === 'A' && e.to === 'B'));
      assert.ok(result.edges.some(e => e.from === 'B' && e.to === 'C'));
    });

    it('should skip edges where target is not in subgraph', () => {
      const graph = new Graph(nodes, edges);
      const result = graph.subgraph(new Set(['A', 'B']));
      assert.equal(result.nodes.length, 2);
      assert.equal(result.edges.length, 1);
      assert.equal(result.edges[0].from, 'A');
      assert.equal(result.edges[0].to, 'B');
    });

    it('should return empty nodes and edges for empty set', () => {
      const graph = new Graph(nodes, edges);
      const result = graph.subgraph(new Set());
      assert.equal(result.nodes.length, 0);
      assert.equal(result.edges.length, 0);
    });

    it('should only include edges between nodes in the set', () => {
      const graph = new Graph(nodes, edges);
      const result = graph.subgraph(new Set(['A', 'C']));
      assert.equal(result.nodes.length, 2);
      assert.equal(result.edges.length, 0);
    });
  });

  describe('getNeighbors / getParents with missing node', () => {
    it('should return empty set for missing node neighbor lookup', () => {
      const graph = new Graph(nodes, edges);
      const neighbors = graph.getNeighbors('Z');
      assert.equal(neighbors.size, 0);
    });

    it('should return empty set for missing node parent lookup', () => {
      const graph = new Graph(nodes, edges);
      const parents = graph.getParents('Z');
      assert.equal(parents.size, 0);
    });
  });
});
