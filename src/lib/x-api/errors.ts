// ---------------------------------------------------------------------------
// X API v2 Error Handling — per x-api-integration.md spec
// ---------------------------------------------------------------------------

export class XApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(`X API error ${status}`);
    this.name = "XApiError";
  }

  get isRateLimit() {
    return this.status === 429;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isUnauth() {
    return this.status === 401 || this.status === 403;
  }
}
