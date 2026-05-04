import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (response.headersSent) return;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(
        typeof body === 'string' ? { statusCode: status, message: body } : body,
      );
      return;
    }

    const status = this.extractStatus(exception);
    const body = this.extractBody(exception, status);

    if (status >= 500) {
      this.logger.error(
        `Unhandled: ${exception instanceof Error ? exception.message : exception}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(body);
  }

  private extractStatus(exception: unknown): number {
    if (exception && typeof exception === 'object') {
      const obj = exception as any;
      if (typeof obj.getStatus === 'function') {
        const s = obj.getStatus();
        if (typeof s === 'number') return s;
      }
      const statusProp = obj.status ?? obj.statusCode;
      if (typeof statusProp === 'number' && statusProp >= 400 && statusProp < 600) {
        return statusProp;
      }
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private extractBody(exception: unknown, status: number): Record<string, unknown> {
    if (exception && typeof exception === 'object') {
      const obj = exception as any;
      if (typeof obj.getResponse === 'function') {
        const r = obj.getResponse();
        if (r && typeof r === 'object') return r;
        if (typeof r === 'string') return { statusCode: status, message: r };
      }
      if (obj.message) return { statusCode: status, message: obj.message };
    }
    return { statusCode: status, message: 'Internal server error' };
  }
}
