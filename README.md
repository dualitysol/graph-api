# Graph API

Query a microservice dependency graph. Find which services are reachable from public endpoints, lead to a database, or contain vulnerabilities.

Built with TypeScript, zero external HTTP dependencies, BFS-based traversal.

---

## How it works: graph traversal & filter logic

### Filters ask one question each

Every filter asks a reachability question. The answer is always a subgraph — the set of all nodes and edges that form valid routes.

| Filter          | Question                                                                        | Strategy                                                       |
| --------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `publicExposed` | Start from any public-facing service. Where can it reach?                       | **Forward BFS** from matching nodes                            |
| `sink`          | Start from every database or queue. Which services lead there?                  | **Reverse BFS** — follow incoming edges backwards from RDS/SQS |
| `vulnerability` | Start from any service with a known vulnerability. Where can an attacker pivot? | **Forward BFS** from matching nodes                            |

Forward BFS answers "everything reachable from X". Reverse BFS answers "everything that can reach Y". The direction maps directly to the question — no need to invert the graph manually.

### Two filter combination modes

**Chain** — apply filters one after another. The first filter produces a subgraph, the second runs inside that subgraph, and so on. Useful for step-by-step refinement: "first take public services, then from those find routes that reach a sink."

**Intersect** — each filter runs independently on the full graph, then the node and edge sets are intersected. Useful for simultaneous constraints: "services that are both public-facing **and** lead to a vulnerable node."

### Pre-built filter index for O(1) start node lookup

Instead of scanning all nodes on every request, `GraphIndex` runs `filter.matches()` once at startup and caches matching node names per filter type. When a query comes in, the starting set is ready in O(1).

### Level-based response for zero frontend layout work

The response is organised into BFS levels, not a flat node/edge dump. Roots are nodes with no incoming edges inside the subgraph; each subsequent level is one hop deeper. Every node carries a `children` field — a pre-computed subset of neighbours that are strictly deeper. A frontend can render the graph by iterating levels top-to-bottom without running any layout algorithm.

Cyclic subgraphs don't break the builder: levels are assigned on first visit only. Fully cyclic graphs fall back to level 0 for all nodes.

### Edge normalisation at load time

Source edges use two formats — `"to": "single"` and `"to": ["a", "b"]`. Normalising to individual `{ from, to }` pairs once at load removes the type check everywhere else.

### Broken data tolerance

Edges referencing missing nodes are skipped with a warning. Isolated nodes are logged but not removed. The server never crashes on malformed input.

### Filters are extensible in three lines

Add a new filter by implementing `matches(node)` and registering it — no other code changes:

```typescript
class MyFilter extends BaseGraphFilter {
  name = 'myFilter';
  strategy = STRATEGIES.FORWARD_BFS;
  matches(node: GraphNode) {
    /* your condition */
  }
}
registerFilter('myFilter', () => new MyFilter());
```

---

## API

### `GET /graph`

| Parameter | Type                       | Default   | Description                     |
| --------- | -------------------------- | --------- | ------------------------------- |
| `filters` | `string[]` (JSON)          | `[]`      | Filter types to apply           |
| `mode`    | `"chain"` \| `"intersect"` | `"chain"` | How to combine multiple filters |

#### Examples

```bash
# Full graph
curl "http://localhost:3000/graph"

# Public services and everything they reach
curl "http://localhost:3000/graph?filters=[\"publicExposed\"]"

# Routes that end in a sink (RDS / SQS)
curl "http://localhost:3000/graph?filters=[\"sink\"]"

# From public services, find routes that lead to a sink
curl "http://localhost:3000/graph?filters=[\"publicExposed\",\"sink\"]"

# Same, but intersect the two sets instead of chaining
curl "http://localhost:3000/graph?filters=[\"publicExposed\",\"sink\"]&mode=intersect"

# Vulnerable services and everything they reach
curl "http://localhost:3000/graph?filters=[\"vulnerability\"]"
```

#### Errors

| Condition                                | Status |
| ---------------------------------------- | ------ |
| Unknown filter name                      | `400`  |
| Invalid `mode` value                     | `400`  |
| `filters` is not a JSON array of strings | `400`  |
| Unregistered route                       | `404`  |

### Response format

```json
{
  "levels": [
    {
      "level": 0,
      "nodes": {
        "frontend": {
          "name": "frontend",
          "kind": "service",
          "language": "java",
          "publicExposed": true,
          "neighbors": ["admin-basic-info-service"],
          "children": ["admin-basic-info-service"]
        }
      }
    }
  ],
  "meta": {
    "filters": ["publicExposed"],
    "mode": "chain"
  }
}
```

Each node contains `name`, `kind`, `language`, `publicExposed`, `vulnerabilities`, `neighbors`, and `children`.

---

## Available filters

| Filter          | Condition                            | Traversal direction |
| --------------- | ------------------------------------ | ------------------- |
| `publicExposed` | `publicExposed === true`             | Forward BFS         |
| `sink`          | `kind === "rds"` or `kind === "sqs"` | Reverse BFS         |
| `vulnerability` | `vulnerabilities.length > 0`         | Forward BFS         |

---

## Quick start

```bash
docker build -t graph-api .
docker run -p 3000:3000 graph-api
curl http://localhost:3000/health
```

---

## Project structure

```
├── index.ts                    # Entry point
├── packages/
│   ├── app.ts                  # HTTP server + decorator routing
│   ├── errors.ts               # Typed error classes
│   └── dto/types.ts            # Shared response/query types
├── src/
│   ├── graph.entity.ts         # Graph data structure (maps, adjacency)
│   ├── graph.traversal.ts      # BFS forward & reverse, DFS
│   ├── graph.index.ts          # Pre-built filter start-node index
│   ├── graph.filter.ts         # Filter registry + base class
│   ├── graph.service.ts        # Query orchestration (chain/intersect)
│   ├── graph.controller.ts     # HTTP endpoints
│   ├── graph.loader.ts         # JSON file → Graph
│   ├── graph.helpers.ts        # Level builder, edge indexer
│   └── types.ts                # Domain types (GraphNode, Edge, etc.)
└── tests/
```

---

## Scripts

| Script           | Purpose                               |
| ---------------- | ------------------------------------- |
| `npm test`       | Run all tests (60 unit + integration) |
| `npm run build`  | TypeScript compilation                |
| `npm run lint`   | ESLint                                |
| `npm run format` | Prettier                              |
| `npm run check`  | Build + test + lint                   |
