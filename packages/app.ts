import 'reflect-metadata';
import http from 'http';
import { isApiError } from './errors';

const PATH_METADATA = 'path';
const METHOD_METADATA = 'method';
const BUFFER_SIZE = 1024 * 1024; // 1MB max payload

export class Controller {
  [key: string]: RouteHandler | unknown;
}

export interface TypedRequest {
  query: Record<string, string | string[] | undefined>;
  bodyBuffer?: Buffer;
}

type RouteHandler = (req: TypedRequest) => unknown;

export const Route = (method: string, path: string) => {
  return (target: Controller, propertyKey: string) => {
    Reflect.defineMetadata(PATH_METADATA, path, target, propertyKey);
    Reflect.defineMetadata(METHOD_METADATA, method, target, propertyKey);
  };
};

export class App {
  private routeMap = new Map<string, RouteHandler>();

  public registerController(controller: Controller): void {
    const proto = Object.getPrototypeOf(controller);
    const methods = Object.getOwnPropertyNames(proto);

    for (const methodName of methods) {
      const path: string | undefined = Reflect.getMetadata(PATH_METADATA, controller, methodName);
      const method: string | undefined = Reflect.getMetadata(METHOD_METADATA, controller, methodName);

      if (path && method) {
        const handler = controller[methodName] as unknown as RouteHandler;
        this.routeMap.set(`${method}:${path}`, handler.bind(controller));
      }
    }
  }

  public listen(port: number): http.Server {
    const server = http
      .createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
        const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = urlObj.pathname;

        // Parse query params into Record
        const query: Record<string, string | string[] | undefined> = {};
        for (const [key, value] of urlObj.searchParams.entries()) {
          const existing = query[key];
          if (existing === undefined) {
            query[key] = value;
          } else if (Array.isArray(existing)) {
            existing.push(value);
          } else {
            query[key] = [existing, value];
          }
        }

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json');

        // Handle OPTIONS for CORS preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const extReq = req as unknown as TypedRequest;

        // Parse body for POST/PUT requests with zero-copy buffer handling
        if (req.method === 'POST' || req.method === 'PUT') {
          try {
            extReq.bodyBuffer = await this.parseBodyBuffer(req);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Invalid request body';
            res.writeHead(400);
            res.end(
              JSON.stringify({
                error: 'BadRequest',
                message,
                timestamp: Date.now(),
              }),
            );
            return;
          }
        }

        // Attach parsed query to request
        extReq.query = query;

        // Find and execute handler
        const routeKey = `${req.method}:${pathname}`;
        const handler = this.routeMap.get(routeKey);

        if (handler) {
          try {
            const result = await handler(extReq);
            res.writeHead(200);
            res.end(JSON.stringify(result));
          } catch (err: unknown) {
            if (isApiError(err)) {
              res.writeHead(err.statusCode);
              res.end(JSON.stringify(err.toJSON()));
            } else {
              const message = err instanceof Error ? err.message : 'Unknown error';
              res.writeHead(500);
              res.end(
                JSON.stringify({
                  error: 'InternalServerError',
                  message,
                  timestamp: Date.now(),
                }),
              );
            }
          }
        } else {
          res.writeHead(404);
          res.end(
            JSON.stringify({
              error: 'NotFound',
              message: `No handler for ${req.method} ${pathname}`,
              timestamp: Date.now(),
            }),
          );
        }
      })
      .listen(port);

    return server;
  }

  private parseBodyBuffer(req: http.IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;

      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > BUFFER_SIZE) {
          reject(new Error('Payload too large'));
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        try {
          const merged =
            chunks.length === 0 ? Buffer.alloc(0) : chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, size);
          resolve(merged);
        } catch (err) {
          reject(err);
        }
      });

      req.on('error', reject);
    });
  }
}
