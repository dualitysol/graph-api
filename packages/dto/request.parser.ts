export class RequestParser {
  static parseQueryFilters(queryString: string | string[] | undefined): string[] | undefined {
    if (!queryString) return undefined;

    const filterStr = Array.isArray(queryString) ? queryString[0] : queryString;

    try {
      const parsed = JSON.parse(filterStr);
      if (!Array.isArray(parsed)) {
        throw new Error('filters must be a JSON array');
      }
      if (!parsed.every(item => typeof item === 'string')) {
        throw new Error('each filter must be a string');
      }
      return parsed as string[];
    } catch {
      throw new Error('Invalid filters parameter: expected JSON array of strings, e.g., ["publicExposed","sink"]');
    }
  }
}
