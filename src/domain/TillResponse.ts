export class TillResponse {
  statusCode: number;
  headers: object;
  body: string;

  constructor(statusCode: number, headers: object, body: string) {
    this.statusCode = statusCode;
    this.headers = headers;
    this.body = body;
  }
}