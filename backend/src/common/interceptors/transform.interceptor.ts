import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, StandardApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardApiResponse<T>> {
    return next.handle().pipe(
      map((payload: T) => {
        const customMessage =
          payload !== null &&
          typeof payload === 'object' &&
          'message' in payload &&
          typeof (payload as Record<string, unknown>).message === 'string'
            ? ((payload as Record<string, unknown>).message as string)
            : 'Thao tác thành công';

        return {
          success: true,
          data: payload,
          message: customMessage,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}

