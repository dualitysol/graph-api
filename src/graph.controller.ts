import { Controller, Route, TypedRequest } from '../packages/app';
import { GraphService } from './graph.service';
import type { QueryMode } from '../packages/dto/types';
import { RequestParser } from '../packages/dto/request.parser';
import { BadRequestError, InternalServerError } from '../packages/errors';

export class GraphController extends Controller {
  private graphService: GraphService;

  constructor(graphService: GraphService) {
    super();
    this.graphService = graphService;
  }

  @Route('GET', '/health')
  async health() {
    return { status: 'ok' };
  }

  @Route('GET', '/graph')
  async getGraph(req: TypedRequest) {
    try {
      const query = req.query;
      let filters: string[] | undefined;
      if (query.filters) {
        try {
          filters = RequestParser.parseQueryFilters(query.filters);
        } catch (e: unknown) {
          throw new BadRequestError(e instanceof Error ? e.message : 'Invalid filters parameter');
        }
      }

      let mode: QueryMode = 'chain';
      if (query.mode) {
        if (query.mode !== 'chain' && query.mode !== 'intersect') {
          throw new BadRequestError('mode must be "chain" or "intersect"');
        }
        mode = query.mode === 'intersect' ? 'intersect' : 'chain';
      }

      return this.graphService.queryGraph(filters ?? [], mode);
    } catch (e: unknown) {
      if (e instanceof BadRequestError) throw e;
      console.error('Unexpected error:', e);
      throw new InternalServerError('Internal server error');
    }
  }
}
