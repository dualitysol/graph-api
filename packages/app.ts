import 'reflect-metadata';
import http from 'http';
import url from 'url';
import { isApiError } from './errors';

const PATH_METADATA = 'path';
const METHOD_METADATA = 'method';
const BUFFER_SIZE = 1024 * 1024; // 1MB max payload

export const Route = (method: string, path: string) => {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(PATH_METADATA, path, target, propertyKey);
    Reflect.defineMetadata(METHOD_METADATA, method, target, propertyKey);
  };
};

export class App {
  private controllers: any[] = [];
  private routeMap = new Map<string, Function>();

  public registerController(controller: any) {
    this.controllers.push(controller);
    const proto = Object.getPrototypeOf(controller);
    const methods = Object.getOwnPropertyNames(proto);

    for (const methodName of methods) {
      const path = Reflect.getMetadata(PATH_METADATA, controller, methodName);
      const method = Reflect.getMetadata(METHOD_METADATA, controller, methodName);

      if (path && method) {
        this.routeMap.set(`${method}:${path}`, controller[methodName].bind(controller));
      }
    }
  }

  public listen(port: number) {
    http
      .createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
        const parsedUrl = url.parse(req.url || '', true);

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

        // Parse body for POST/PUT requests with zero-copy buffer handling
        if (req.method === 'POST' || req.method === 'PUT') {
          try {
            const bodyBuffer = await this.parseBodyBuffer(req);
            (req as any).bodyBuffer = bodyBuffer;
          } catch (error: any) {
            res.writeHead(400);
            res.end(
              JSON.stringify({
                error: 'BadRequest',
                message: error.message || 'Invalid request body',
                timestamp: Date.now(),
              }),
            );
            return;
          }
        }

        // Attach parsed query to request
        (req as any).query = parsedUrl.query;

        // Find and execute handler
        const routeKey = `${req.method}:${parsedUrl.pathname}`;
        const handler = this.routeMap.get(routeKey);

        if (handler) {
          try {
            const result = await handler(req);
            res.writeHead(200);
            res.end(JSON.stringify(result));
          } catch (error: any) {
            if (isApiError(error)) {
              res.writeHead(error.statusCode);
              res.end(JSON.stringify(error.toJSON()));
            } else {
              res.writeHead(500);
              res.end(
                JSON.stringify({
                  error: 'InternalServerError',
                  message: error?.message || 'Unknown error',
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
              message: `No handler for ${req.method} ${parsedUrl.pathname}`,
              timestamp: Date.now(),
            }),
          );
        }
      })
      .listen(port);
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
          const merged = chunks.length === 0 ? Buffer.alloc(0) : chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, size);
          resolve(merged);
        } catch (err) {
          reject(err);
        }
      });

      req.on('error', reject);
    });
  }
}