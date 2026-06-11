import { describe, it, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { GraphLoader } from '../src/graph.loader';
import { RawGraph } from '../src/types';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-loader-test-'));
after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

const makeGraphFile = (graph: RawGraph): string => {
  const filePath = path.join(tmpDir, `graph-${crypto.randomUUID()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(graph), 'utf-8');
  return filePath;
};

describe('GraphLoader', () => {
  afterEach(() => GraphLoader.resetInstance());

  it('should load graph from file', () => {
    const filePath = makeGraphFile({
      nodes: [{ name: 'A', kind: 'service', publicExposed: true }, { name: 'B', kind: 'rds' }],
      edges: [{ from: 'A', to: 'B' }],
    });

    const loader = GraphLoader.getInstance();
    loader.loadGraph(filePath);
    assert.equal(loader.getGraph().nodes.length, 2);
    assert.equal(loader.getGraph().edges.length, 1);
  });

  it('should normalize edges with single target', () => {
    const filePath = makeGraphFile({
      nodes: [{ name: 'A', kind: 'service', publicExposed: true }, { name: 'B', kind: 'rds' }],
      edges: [{ from: 'A', to: 'B' }],
    });

    const loader = GraphLoader.getInstance();
    loader.loadGraph(filePath);
    const edges = loader.getNormalizedEdges();
    assert.equal(edges.length, 1);
    assert.equal(edges[0].from, 'A');
    assert.equal(edges[0].to, 'B');
  });

  it('should normalize edges with array target', () => {
    const filePath = makeGraphFile({
      nodes: [
        { name: 'A', kind: 'service' },
        { name: 'B', kind: 'service' },
        { name: 'C', kind: 'service' },
      ],
      edges: [{ from: 'A', to: ['B', 'C'] }],
    });

    const loader = GraphLoader.getInstance();
    loader.loadGraph(filePath);
    const edges = loader.getNormalizedEdges();
    assert.equal(edges.length, 2);
    assert.equal(edges[0].to, 'B');
    assert.equal(edges[1].to, 'C');
  });

  it('should throw when graph not loaded', () => {
    const loader = GraphLoader.getInstance();
    assert.throws(() => loader.getGraph(), /Graph not loaded/);
  });

  it('should return cached graph on second getGraph call', () => {
    const filePath = makeGraphFile({
      nodes: [{ name: 'A', kind: 'service' }],
      edges: [],
    });

    const loader = GraphLoader.getInstance();
    loader.loadGraph(filePath);
    const graph1 = loader.getGraph();
    const graph2 = loader.getGraph();
    assert.equal(graph1, graph2);
  });
});
