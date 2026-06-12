import 'reflect-metadata';
import { App } from './packages/app';
import { GraphLoader } from './src/graph.loader';
import { GraphService } from './src/graph.service';
import { GraphController } from './src/graph.controller';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const GRAPH_FILE = process.env.GRAPH_FILE || './assets/graphs.json';

async function main() {
  try {
    console.log(`Loading graph from ${GRAPH_FILE}...`);
    const graph = GraphLoader.load(GRAPH_FILE);
    console.log('Graph loaded successfully');

    const graphService = new GraphService(graph);
    const app = new App();
    const graphController = new GraphController(graphService);
    app.registerController(graphController);

    app.listen(PORT);
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`GET /graph - Query the graph with optional filters`);
  } catch (error: Error | unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to start server:', message);
    process.exit(1);
  }
}

main();
