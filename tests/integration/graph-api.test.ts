import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { App } from '../../packages/app';
import { GraphLoader } from '../../src/graph.loader';
import { GraphService } from '../../src/graph.service';
import { GraphController } from '../../src/graph.controller';
import { GraphQueryResponse } from '../../packages/dto/types';

function createTestApp() {
  const graph = GraphLoader.load('./assets/graphs.json');
  const service = new GraphService(graph);
  const controller = new GraphController(service);
  const app = new App();
  app.registerController(controller);
  return { app, service };
}

describe('Graph API Integration', () => {
  let server: http.Server;
  let port: number;

  before(async () => {
    const { app } = createTestApp();
    port = Math.floor(Math.random() * 10000) + 30000;
    server = app.listen(port);
    await new Promise<void>(resolve => server.on('listening', () => resolve()));
  });

  after(() => {
    server.close();
  });

  it('GET /health returns 200', async () => {
    const res = await fetch(`http://localhost:${port}/health`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { status: string };
    assert.equal(json.status, 'ok');
  });

  it('GET /graph without filters returns full graph', async () => {
    const res = await fetch(`http://localhost:${port}/graph`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as GraphQueryResponse;
    assert.ok(Array.isArray(json.levels));
    assert.ok(json.levels.length > 0);
    assert.ok(json.meta);
    assert.equal(json.meta.filters.length, 0);
    assert.equal(json.meta.mode, 'chain');
  });

  it('GET /graph?filters=["publicExposed"] returns 200', async () => {
    const url = `http://localhost:${port}/graph?filters=${encodeURIComponent('["publicExposed"]')}`;
    const res = await fetch(url);
    assert.equal(res.status, 200);
    const json = (await res.json()) as GraphQueryResponse;
    assert.ok(Array.isArray(json.levels));
    assert.equal(json.meta?.filters[0], 'publicExposed');
  });

  it('GET /graph?filters=["sink"] returns nodes leading to sinks', async () => {
    const url = `http://localhost:${port}/graph?filters=${encodeURIComponent('["sink"]')}`;
    const res = await fetch(url);
    assert.equal(res.status, 200);
    const json = (await res.json()) as GraphQueryResponse;
    // Should have at least some levels with sink-related nodes
    assert.ok(json.levels.length > 0);
    assert.equal(json.meta?.filters[0], 'sink');
  });

  it('GET /graph?filters=["vulnerability"] returns 200', async () => {
    const url = `http://localhost:${port}/graph?filters=${encodeURIComponent('["vulnerability"]')}`;
    const res = await fetch(url);
    assert.equal(res.status, 200);
    const json = (await res.json()) as GraphQueryResponse;
    assert.ok(Array.isArray(json.levels));
    assert.equal(json.meta?.filters[0], 'vulnerability');
  });

  it('GET /graph?filters=["publicExposed","sink"]&mode=chain returns 200', async () => {
    const url = `http://localhost:${port}/graph?filters=${encodeURIComponent('["publicExposed","sink"]')}&mode=chain`;
    const res = await fetch(url);
    assert.equal(res.status, 200);
    const json = (await res.json()) as GraphQueryResponse;
    assert.equal(json.meta?.mode, 'chain');
    assert.equal(json.meta?.filters.length, 2);
  });

  it('GET /graph?filters=["publicExposed","sink"]&mode=intersect returns 200', async () => {
    const url = `http://localhost:${port}/graph?filters=${encodeURIComponent('["publicExposed","sink"]')}&mode=intersect`;
    const res = await fetch(url);
    assert.equal(res.status, 200);
    const json = (await res.json()) as GraphQueryResponse;
    assert.equal(json.meta?.mode, 'intersect');
    assert.equal(json.meta?.filters.length, 2);
  });

  it('response levels have correct structure', async () => {
    const res = await fetch(`http://localhost:${port}/graph`);
    const json = (await res.json()) as GraphQueryResponse;

    for (const level of json.levels) {
      assert.ok(typeof level.level === 'number');
      assert.ok(typeof level.nodes === 'object');
      assert.ok(!Array.isArray(level.nodes));

      for (const [name, node] of Object.entries(level.nodes)) {
        assert.equal(node.name, name);
        assert.ok(typeof node.kind === 'string');
        assert.ok(Array.isArray(node.neighbors));
        assert.ok(Array.isArray(node.children));
        // All children must be neighbors
        for (const child of node.children) {
          assert.ok(node.neighbors.includes(child));
        }
      }
    }
  });

  it('GET /graph?filters=["unknown"] returns 400', async () => {
    const url = `http://localhost:${port}/graph?filters=${encodeURIComponent('["unknown"]')}`;
    const res = await fetch(url);
    assert.equal(res.status, 400);
    const json = (await res.json()) as { error: string; message: string };
    assert.match(json.message, /Unknown filter type/);
  });

  it('GET /graph?filters=not-json returns 400', async () => {
    const res = await fetch(`http://localhost:${port}/graph?filters=hello`);
    assert.equal(res.status, 400);
    const json = (await res.json()) as { message: string };
    assert.match(json.message, /Invalid filters parameter/);
  });

  it('GET /graph?filters=123 (valid JSON, not array) returns 400', async () => {
    const res = await fetch(`http://localhost:${port}/graph?filters=123`);
    assert.equal(res.status, 400);
  });

  it('GET /graph?mode=bad returns 400', async () => {
    const res = await fetch(`http://localhost:${port}/graph?mode=bad`);
    assert.equal(res.status, 400);
  });

  it('GET /nonexistent returns 404', async () => {
    const res = await fetch(`http://localhost:${port}/nonexistent`);
    assert.equal(res.status, 404);
    const json = (await res.json()) as { error: string };
    assert.equal(json.error, 'NotFound');
  });
});

