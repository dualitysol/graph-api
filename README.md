# Graph API – Backslash Test Task Solution

## 1. Overview

I implemented a REST API that loads a microservice graph (from the Train Ticket JSON dataset) and filters routes by three criteria:

- `publicExposed` – nodes with `publicExposed: true`
- `sink` – nodes of type `rds` or `sqs`
- `vulnerability` – nodes that have a non‑empty `vulnerabilities` array

The API supports two ways of combining filters:

- `chain` – sequential application (each filter works on the result of the previous one)
- `intersect` – intersection of results from applying all filters independently to the original graph

The code is written in TypeScript.

## 2. Key technical decisions and reasoning

### 2.1. Edge normalization
In the source JSON, edges can be written as `"to": "single_node"` or `"to": ["node1", "node2"]`. I wrote a `normalizeEdges` function that always turns `to` into an array and generates separate `{ from, to }` objects. This removes the need to check the type of `to` everywhere else.

### 2.2. Pre‑building indexes for filters
Instead of scanning all nodes on every request and checking conditions, I build an index (`GraphIndex`) once when the graph is loaded. For each registered filter, `filter.matches(node)` is called, and matching node names are stored in a `Map<filterType, Set<string>>`. When a filter is applied, the starting nodes are taken from this index in O(1). This speeds up queries, especially for large graphs.

### 2.3. Graph traversal – BFS forward, BFS reverse, and why DFS is not used for filtering

I implemented two breadth‑first search directions:

- **Forward BFS** – starts from a set of nodes and follows outgoing edges to all reachable nodes. This is used for filters like `publicExposed` and `vulnerability`, where the requirement is to find routes *starting* from those nodes (i.e., everything that can be reached from a public or vulnerable service).
- **Reverse BFS** – starts from a set of nodes and follows incoming edges backwards. This is used for the `sink` filter, because the task asks for routes that *end* in a sink (RDS/SQS). Reverse BFS finds all nodes that can eventually reach a sink, which is exactly the set of services that have a path to the database or queue.

I chose **BFS over DFS** for the actual filtering because BFS guarantees that all reachable nodes are found, regardless of graph shape, and it does so without recursion. BFS also naturally finds the shortest path in terms of number of hops, though path length is not required. The iterative implementation (using a `while` loop and a queue) avoids stack overflow on deep graphs.

The code also contains a `dfs` method, but **it is not used in the current filtering logic**. I included it as a general‑purpose traversal utility that may be useful for future extensions (for example, if someone needs to detect cycles or perform topological sorting). Keeping it does not affect performance because it is never called.

### 2.4. Two filter combination modes
- **Chain:** The first filter produces a subgraph, the second filter is applied to that subgraph, and so on. This is natural for scenarios where you refine the route step by step (e.g., "first take all public services, then from those find routes that reach a sink").
- **Intersect:** Each filter is applied to the original graph, then I intersect the resulting node sets and edge sets. This is convenient when you need routes that satisfy multiple conditions simultaneously (e.g., start at a public service **and** reach a vulnerable node). For edge intersection, I use a helper `indexEdges` that builds a `Map<from, Set<to>>` to quickly test whether an edge exists.

### 2.5. Handling broken edges and isolated nodes
When building the graph, I check whether `edge.from` and `edge.to` exist in the node set. If a node is missing, the edge is skipped and a warning is printed to the console. After processing all edges, nodes that have neither incoming nor outgoing edges are also logged. This prevents the server from crashing due to data errors (for example, the original `graphs.json` contains an edge to a missing `assurance-service` and several isolated nodes). The API continues to work and returns correct subgraphs.

### 2.6. Query caching
Because the graph is static (loaded once at startup), identical requests always return the same result. I added a simple in‑memory cache with a 60‑second TTL and a maximum size of 1000 entries. The cache key is the serialized list of filters. This reduces repeated BFS and subgraph construction work.

### 2.7. Testing
I wrote unit tests for all major components: `Graph`, `GraphTraversal`, `GraphIndex`, `GraphLoader`, `GraphService`, and the filters themselves. The tests use the built‑in `node:test` and `node:assert/strict`, so no extra dependencies are added. Both normal scenarios and edge cases are covered: missing nodes, empty start sets, cycles in the graph. This gives confidence that changes won’t break existing behaviour.

## 3. Assumptions I made during development

- **Directed graph** – all edges have a direction because microservices call each other.
- **`sink` filter** – I interpret it as nodes with `kind: "rds"` or `kind: "sqs"`. Other storage types (e.g., `elasticache`) are not included because the task explicitly said "rds/sql".
- **Vulnerable nodes** – a node is considered vulnerable if its `vulnerabilities` array is non‑empty. Severity or other fields are not taken into account.
- **`intersect` mode** – implemented as intersection of already computed subgraphs (nodes and edges). An alternative approach (intersecting start sets then running a single BFS) would be faster, but I chose this one for its simplicity and clarity.
- **Synchronous graph loading** – the graph is loaded at startup using `fs.readFileSync`. This is fine for a static file; the server will wait a few milliseconds.
- **DFS method is present but unused** – it does not affect performance or correctness; it is kept as a potential building block for future features like cycle detection.

## 4. How to add a new filter (extensibility)

All filters are registered in `graph.filter.ts` inside the `filterRegistry`. To add a new filter:

1. Create a class that extends `BaseGraphFilter`.
2. Implement the `name` field (unique string identifier), the `strategy` field (`FORWARD_BFS` or `REVERSE_BFS`), and the `matches(node)` method.
3. Register the filter using `registerFilter(NAME, () => new MyFilter())`.

The index and the application logic will automatically pick up the new filter. No other parts of the code need to be changed.

## API Query Format

The API exposes a single endpoint `GET /graph` that accepts two query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `filters` | JSON array of strings | `[]` (no filters) | List of filter types to apply. Valid values: `"publicExposed"`, `"sink"`, `"vulnerability"`. |
| `mode` | string | `"chain"` | How to combine multiple filters: `"chain"` (sequential) or `"intersect"` (intersection). |

The `filters` parameter must be a **valid JSON array** passed as a query string.  
Use `encodeURIComponent` or simply wrap the array in quotes in your `curl` command.

### Examples

#### 1. No filters – return the full graph

```bash
curl "http://localhost:3000/graph"
```

#### 2. Single filter – public exposed services and everything reachable from them

```bash
curl "http://localhost:3000/graph?filters=[\"publicExposed\"]"
```

#### 3. Two filters in **chain** mode (default) – start from public exposed, then from that result find routes that end in a sink

```bash
curl "http://localhost:3000/graph?filters=[\"publicExposed\",\"sink\"]"
```

#### 4. Two filters in **intersect** mode – routes that both start from a public exposed service **and** end in a sink

```bash
curl "http://localhost:3000/graph?filters=[\"publicExposed\",\"sink\"]&mode=intersect"
```

#### 5. Vulnerability filter – find all routes reachable from any service that has a vulnerability

```bash
curl "http://localhost:3000/graph?filters=[\"vulnerability\"]"
```

#### 6. All three filters together in chain mode

```bash
curl "http://localhost:3000/graph?filters=[\"publicExposed\",\"sink\",\"vulnerability\"]&mode=chain"
```

### Notes

- If `filters` is omitted or empty, the whole graph is returned.
- The order of filters in the array matters only in `chain` mode (applied left to right). In `intersect` mode order does not matter.
- Invalid filter names (e.g., `"unknown"`) will cause a `400 Bad Request` error with a descriptive message.
- The response format is a JSON object containing `nodes` and `edges` arrays.
