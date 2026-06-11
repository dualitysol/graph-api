import { FilterRequest } from './types';

export class RequestParser {
  static parseQueryFilters(queryString: string | string[] | undefined): string[] | undefined {
    if (!queryString) return undefined;

    const filterStr = Array.isArray(queryString) ? queryString[0] : queryString;

    try {
      const parsed = JSON.parse(filterStr);
      const requests = Array.isArray(parsed) ? parsed : [parsed];
      
      return requests.map((r: FilterRequest) => r.type);
    } catch (e) {
      throw new Error('Invalid filters parameter');
    }
  }
}