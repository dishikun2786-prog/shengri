import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Decimal } from '@prisma/client/runtime/library';

function transformPrismaTypes(obj: unknown, seen = new WeakSet()): unknown {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'bigint') return Number(obj);

  if (obj instanceof Decimal) return obj.toNumber();

  if (obj instanceof Date) return obj;

  if (Array.isArray(obj)) return obj.map((item) => transformPrismaTypes(item, seen));

  if (typeof obj === 'object') {
    if (seen.has(obj as object)) return undefined;
    seen.add(obj as object);
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = transformPrismaTypes(value, seen);
    }
    return result;
  }

  return obj;
}

@Injectable()
export class PrismaSerializeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => transformPrismaTypes(data)));
  }
}
