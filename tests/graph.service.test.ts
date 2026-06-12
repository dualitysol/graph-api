import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Graph } from '../src/graph.entity';
import { GraphService } from '../src/graph.service';
import { NestedGraph } from '../src/graph.helpers';
import { GraphNode, NormalizedEdge } from '../src/types';

const testNodes: GraphNode[] = [
    { name: 'frontend', kind: 'service', publicExposed: true },
    { name: 'api-gateway', kind: 'service', publicExposed: true },
    { name: 'auth-service', kind: 'service', vulnerabilities: [{ file: 'auth.ts', severity: 'high', message: 'XSS' }] },
    { name: 'order-service', kind: 'service' },
    { name: 'db', kind: 'rds' },
    { name: 'cache', kind: 'elasticache' },
    { name: 'queue', kind: 'sqs' },
];

const testEdges: NormalizedEdge[] = [
    { from: 'frontend', to: 'api-gateway' },
    { from: 'api-gateway', to: 'auth-service' },
    { from: 'api-gateway', to: 'order-service' },
    { from: 'auth-service', to: 'db' },
    { from: 'order-service', to: 'db' },
    { from: 'order-service', to: 'queue' },
    { from: 'frontend', to: 'cache' },
];

/** Collect all node names from a nested graph. */
function getAllNames(result: NestedGraph): string[] {
  const names: string[] = [];
  for (const level of result.levels) {
    for (const name of Object.keys(level.nodes)) {
      names.push(name);
    }
  }
  return names;
}

const setupService = (): GraphService => {
  const graph = new Graph(testNodes, testEdges);
  return new GraphService(graph);
};

describe('GraphService', () => {
  it('should return full graph without filters', () => {
    const svc = setupService();
    const result = svc.queryGraph();
    const names = getAllNames(result);
    assert.equal(names.length, 7);
  });

  describe('chain mode', () => {
    it('should chain two filters: publicExposed then sink', () => {
      const svc = setupService();
      const result = svc.queryGraph(['publicExposed', 'sink'], 'chain');
      const names = getAllNames(result);
      assert.ok(names.includes('frontend'));
      assert.ok(names.includes('api-gateway'));
      assert.ok(names.includes('auth-service'));
      assert.ok(names.includes('order-service'));
      assert.ok(names.includes('db'));
      assert.ok(names.includes('queue'));
      assert.equal(names.includes('cache'), false);
    });

    it('should chain publicExposed then vulnerability', () => {
      const svc = setupService();
      const result = svc.queryGraph(['publicExposed', 'vulnerability'], 'chain');
      const names = getAllNames(result);
      assert.equal(names.includes('auth-service'), true);
      assert.equal(names.includes('db'), true);
      assert.equal(names.includes('frontend'), false);
      assert.equal(names.includes('api-gateway'), false);
    });

    it('should handle single filter', () => {
      const svc = setupService();
      const result = svc.queryGraph(['sink'], 'chain');
      const names = getAllNames(result);
      assert.ok(names.includes('db'));
      assert.ok(names.includes('queue'));
    });
  });

  describe('intersect mode', () => {
    it('should intersect publicExposed and sink', () => {
      const svc = setupService();
      const result = svc.queryGraph(['publicExposed', 'sink'], 'intersect');
      const names = getAllNames(result);
      assert.ok(names.length > 0);
      assert.ok(names.includes('frontend'));
      assert.ok(names.includes('db'));
    });
  });
});
