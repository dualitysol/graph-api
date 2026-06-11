import 'reflect-metadata';
import { App } from './packages/app';
import { GraphLoader } from './src/graph.loader';
import { GraphController } from './src/graph.controller';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const GRAPH_FILE = process.env.GRAPH_FILE || './assets/graphs.json';

async function main() {
  try {
    // Load graph from JSON file
    console.log(`Loading graph from ${GRAPH_FILE}...`);
    const loader = GraphLoader.getInstance();
    loader.loadGraph(GRAPH_FILE);
    console.log('Graph loaded successfully');

    // Initialize app
    const app = new App();

    // Register controller
    const graphController = new GraphController();
    app.registerController(graphController);

    // Start server
    app.listen(PORT);
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`GET /graph - Query the graph with optional filters`);
  } catch (error: any) {
    console.error('Failed to start server:', error?.message || error);
    process.exit(1);
  }
}

main();
