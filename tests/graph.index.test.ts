import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GraphIndex } from '../src/graph.index';
import { GraphNode } from '../src/types';

const nodes: GraphNode[] = [
  { name: 'frontend', kind: 'service', publicExposed: true },
  { name: 'api-gateway', kind: 'service', publicExposed: true },
  { name: 'auth-service', kind: 'service', vulnerabilities: [{ file: 'auth.ts', severity: 'high', message: 'XSS' }] },
  { name: 'db', kind: 'rds' },
  { name: 'cache', kind: 'elasticache' },
  { name: 'queue', kind: 'sqs' },
];

describe('GraphIndex', () => {
  describe('build', () => {
    it('should create index for publicExposed nodes', () => {
      const index = new GraphIndex();
      index.build(nodes);
      const publicNodes = index.get('publicExposed');
      assert.equal(publicNodes.size, 2);
      assert.ok(publicNodes.has('frontend'));
      assert.ok(publicNodes.has('api-gateway'));
    });

    it('should create index for sink nodes (rds and sqs)', () => {
      const index = new GraphIndex();
      index.build(nodes);
      const sinkNodes = index.get('sink');
      assert.equal(sinkNodes.size, 2);
      assert.ok(sinkNodes.has('db'));
      assert.ok(sinkNodes.has('queue'));
      assert.equal(sinkNodes.has('cache'), false);
    });

    it('should create index for vulnerability nodes', () => {
      const index = new GraphIndex();
      index.build(nodes);
      const vulnNodes = index.get('vulnerability');
      assert.equal(vulnNodes.size, 1);
      assert.ok(vulnNodes.has('auth-service'));
    });
  });

  describe('get', () => {
    it('should return empty set for unknown filter type', () => {
      const index = new GraphIndex();
      index.build(nodes);
      const result = index.get('unknown');
      assert.equal(result.size, 0);
    });
  });
});
