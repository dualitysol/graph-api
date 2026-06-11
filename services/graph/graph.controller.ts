import { Route } from '../../packages/app';
import { graphService, QueryMode } from './graph.service';
import { RequestParser } from '../../packages/dto/request.parser';
import { BadRequestError } from '../../packages/errors';

export class GraphController {

  @Route('GET', '/graph')
  async getGraph(req: any) {
    const filters = req?.query?.filters
      ? RequestParser.parseQueryFilters(req.query.filters)
      : undefined;

    const mode: QueryMode = req?.query?.mode === 'intersect' ? 'intersect' : 'chain';

    try {
      return graphService.queryGraph(filters ?? [], mode);
    } catch (e: any) {
      throw new BadRequestError(e?.message || 'Invalid request');
    }
  }
}