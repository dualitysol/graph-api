import { describe, it, after } from 'node:test';
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
  it('should create a Graph from file', () => {
    const filePath = makeGraphFile({
      nodes: [
        { name: 'A', kind: 'service', publicExposed: true },
        { name: 'B', kind: 'rds' },
      ],
      edges: [{ from: 'A', to: 'B' }],
    });

    const graph = GraphLoader.load(filePath);
    assert.equal(graph.getNodes().length, 2);
    assert.equal(graph.getAllEdges().length, 1);
    assert.ok(graph.hasNode('A'));
    assert.ok(graph.hasNode('B'));
  });

  it('should normalize edges with single target', () => {
    const filePath = makeGraphFile({
      nodes: [
        { name: 'A', kind: 'service', publicExposed: true },
        { name: 'B', kind: 'rds' },
      ],
      edges: [{ from: 'A', to: 'B' }],
    });

    const graph = GraphLoader.load(filePath);
    assert.equal(graph.getAllEdges().length, 1);
    assert.deepEqual([...graph.getNeighbors('A')], ['B']);
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

    const graph = GraphLoader.load(filePath);
    assert.equal(graph.getAllEdges().length, 2);
    assert.deepEqual([...graph.getNeighbors('A')], ['B', 'C']);
  });

  it('should handle file with no edges', () => {
    const filePath = makeGraphFile({
      nodes: [{ name: 'A', kind: 'service' }],
      edges: [],
    });

    const graph = GraphLoader.load(filePath);
    assert.equal(graph.getNodes().length, 1);
    assert.equal(graph.getAllEdges().length, 0);
  });
});
