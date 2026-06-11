import { describe, it, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { RawGraph } from '../src/types';
import { GraphLoader } from '../src/graph.loader';
import { GraphService } from '../src/graph.service';

const testGraph: RawGraph = {
  nodes: [
    { name: 'frontend', kind: 'service', publicExposed: true },
    { name: 'api-gateway', kind: 'service', publicExposed: true },
    { name: 'auth-service', kind: 'service', vulnerabilities: [{ file: 'auth.ts', severity: 'high', message: 'XSS' }] },
    { name: 'order-service', kind: 'service' },
    { name: 'db', kind: 'rds' },
    { name: 'cache', kind: 'elasticache' },
    { name: 'queue', kind: 'sqs' },
  ],
  edges: [
    { from: 'frontend', to: 'api-gateway' },
    { from: 'api-gateway', to: 'auth-service' },
    { from: 'api-gateway', to: 'order-service' },
    { from: 'auth-service', to: 'db' },
    { from: 'order-service', to: 'db' },
    { from: 'order-service', to: 'queue' },
    { from: 'frontend', to: 'cache' },
  ],
};

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-service-test-'));
after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

const setupService = (): GraphService => {
  GraphLoader.resetInstance();

  const filePath = path.join(tmpDir, `graph-${crypto.randomUUID()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(testGraph), 'utf-8');

  const loader = GraphLoader.getInstance();
  loader.loadGraph(filePath);
  return new GraphService();
};

describe('GraphService', () => {
  afterEach(() => GraphLoader.resetInstance());

  it('should return full graph without filters', () => {
    const svc = setupService();
    const result = svc.queryGraph();
    assert.equal(result.nodes.length, 7);
    assert.equal(result.edges.length, 7);
  });

  describe('chain mode', () => {
    it('should chain two filters: publicExposed then sink', () => {
      const svc = setupService();
      const result = svc.queryGraph(['publicExposed', 'sink'], 'chain');
      assert.ok(result.nodes.some(n => n.name === 'frontend'));
      assert.ok(result.nodes.some(n => n.name === 'api-gateway'));
      assert.ok(result.nodes.some(n => n.name === 'auth-service'));
      assert.ok(result.nodes.some(n => n.name === 'order-service'));
      assert.ok(result.nodes.some(n => n.name === 'db'));
      assert.ok(result.nodes.some(n => n.name === 'queue'));
      assert.equal(result.nodes.some(n => n.name === 'cache'), false);
    });

    it('should chain publicExposed then vulnerability', () => {
      const svc = setupService();
      const result = svc.queryGraph(['publicExposed', 'vulnerability'], 'chain');
      assert.equal(result.nodes.some(n => n.name === 'auth-service'), true);
      assert.equal(result.nodes.some(n => n.name === 'db'), true);
      assert.equal(result.nodes.some(n => n.name === 'frontend'), false);
      assert.equal(result.nodes.some(n => n.name === 'api-gateway'), false);
    });

    it('should handle single filter', () => {
      const svc = setupService();
      const result = svc.queryGraph(['sink'], 'chain');
      assert.ok(result.nodes.some(n => n.name === 'db'));
      assert.ok(result.nodes.some(n => n.name === 'queue'));
    });
  });

  describe('intersect mode', () => {
    it('should intersect publicExposed and sink', () => {
      const svc = setupService();
      const result = svc.queryGraph(['publicExposed', 'sink'], 'intersect');
      assert.ok(result.nodes.length > 0);
      assert.ok(result.nodes.some(n => n.name === 'frontend'));
      assert.ok(result.nodes.some(n => n.name === 'db'));
    });
  });
});
