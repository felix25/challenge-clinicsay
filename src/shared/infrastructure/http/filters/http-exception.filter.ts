import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else {
        const payload = body as {
          message?: string | string[];
          error?: string;
        };

        message = Array.isArray(payload.message)
          ? payload.message.join(', ')
          : payload.message ?? payload.error ?? exception.message;
      }
    } else {
      this.logger.error(
        exception instanceof Error
          ? exception.stack
          : String(exception),
      );
    }

    response.status(status).json({
      error: message,
    });
  }
}
