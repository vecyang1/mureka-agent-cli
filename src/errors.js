export class CliError extends Error {
  constructor(message, { code = 1, details } = {}) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.details = details;
  }
}

export class ApiError extends Error {
  constructor(message, { status, body, traceId } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.traceId = traceId;
  }
}
