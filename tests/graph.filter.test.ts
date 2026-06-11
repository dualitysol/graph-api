import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Graph } from '../src/graph.entity';
import { GraphTraversal } from '../src/graph.traversal';
import { GraphIndex } from '../src/graph.index';
import { createFilter, getAvailableFilters } from '../src/graph.filter';
import { GraphNode, NormalizedEdge } from '../src/types';

const nodes: GraphNode[] = [
  { name: 'frontend', kind: 'service', publicExposed: true },
  { name: 'api-gateway', kind: 'service', publicExposed: true },
  { name: 'auth-service', kind: 'service', vulnerabilities: [{ file: 'auth.ts', severity: 'high', message: 'XSS' }] },
  { name: 'db', kind: 'rds' },
  { name: 'cache', kind: 'elasticache' },
  { name: 'queue', kind: 'sqs' },
];

const edges: NormalizedEdge[] = [
  { from: 'frontend', to: 'api-gateway' },
  { from: 'api-gateway', to: 'auth-service' },
  { from: 'auth-service', to: 'db' },
  { from: 'api-gateway', to: 'cache' },
];

function setup(): { traversal: GraphTraversal; graph: Graph; index: GraphIndex } {
  const graph = new Graph(nodes, edges);
  const traversal = new GraphTraversal(graph);
  const index = new GraphIndex();
  index.build(nodes);
  return { traversal, graph, index };
}

describe('Filters', () => {
  describe('createFilter', () => {
    it('should create PublicExposedFilter', () => {
      const filter = createFilter('publicExposed');
      assert.equal(filter.name, 'publicExposed');
      assert.ok(filter.matches(nodes[0]));
      assert.equal(filter.matches(nodes[2]), false);
    });

    it('should create SinkFilter', () => {
      const filter = createFilter('sink');
      assert.equal(filter.name, 'sink');
      assert.ok(filter.matches(nodes[3])); // rds
      assert.ok(filter.matches(nodes[5])); // sqs
      assert.equal(filter.matches(nodes[0]), false);
    });

    it('should create VulnerabilityFilter', () => {
      const filter = createFilter('vulnerability');
      assert.equal(filter.name, 'vulnerability');
      assert.ok(filter.matches(nodes[2]));
      assert.equal(filter.matches(nodes[0]), false);
    });

    it('should throw for unknown filter type', () => {
      assert.throws(() => createFilter('unknown'), /Unknown filter type/);
    });
  });

  describe('getAvailableFilters', () => {
    it('should return all filter names', () => {
      const filters = getAvailableFilters();
      assert.ok(filters.includes('publicExposed'));
      assert.ok(filters.includes('sink'));
      assert.ok(filters.includes('vulnerability'));
      assert.equal(filters.length, 3);
    });
  });

  describe('PublicExposedFilter.apply', () => {
    it('should return all nodes reachable from public exposed nodes', () => {
      const { traversal, graph, index } = setup();
      const filter = createFilter('publicExposed');
      const result = filter.apply(traversal, graph, index);
      assert.equal(result.nodes.length, 5);
      assert.ok(result.nodes.some(n => n.name === 'frontend'));
      assert.ok(result.nodes.some(n => n.name === 'db'));
    });

    it('should return empty when no public exposed nodes', () => {
      const graph = new Graph([nodes[2], nodes[3]], edges.slice(2));
      const traversal = new GraphTraversal(graph);
      const index = new GraphIndex();
      index.build([nodes[2], nodes[3]]);
      const filter = createFilter('publicExposed');
      const result = filter.apply(traversal, graph, index);
      assert.equal(result.nodes.length, 0);
    });
  });

  describe('SinkFilter.apply', () => {
    it('should return all nodes leading to sink nodes', () => {
      const { traversal, graph, index } = setup();
      const filter = createFilter('sink');
      const result = filter.apply(traversal, graph, index);
      assert.ok(result.nodes.some(n => n.name === 'db'));
      assert.ok(result.nodes.some(n => n.name === 'auth-service'));
      assert.ok(result.nodes.some(n => n.name === 'api-gateway'));
      assert.ok(result.nodes.some(n => n.name === 'frontend'));
    });
  });

  describe('VulnerabilityFilter.apply', () => {
    it('should return all nodes reachable from vulnerable nodes', () => {
      const { traversal, graph, index } = setup();
      const filter = createFilter('vulnerability');
      const result = filter.apply(traversal, graph, index);
      assert.ok(result.nodes.some(n => n.name === 'auth-service'));
      assert.ok(result.nodes.some(n => n.name === 'db'));
    });
  });

  describe('apply with subgraph', () => {
    it('should limit traversal to subgraph nodes', () => {
      const { traversal, graph, index } = setup();
      const filter = createFilter('publicExposed');

      const subgraph = new Graph(
        [nodes[0], nodes[1], nodes[3], nodes[4]],
        [edges[0], edges[3]]
      );

      const result = filter.apply(traversal, graph, index, subgraph);
      // frontend -> api-gateway -> cache, db is NOT reachable because auth-service is not in subgraph
      assert.ok(result.nodes.some(n => n.name === 'frontend'));
      assert.ok(result.nodes.some(n => n.name === 'api-gateway'));
      assert.ok(result.nodes.some(n => n.name === 'cache'));
      assert.equal(result.nodes.some(n => n.name === 'db'), false);
      assert.equal(result.nodes.some(n => n.name === 'auth-service'), false);
    });
  });
});
