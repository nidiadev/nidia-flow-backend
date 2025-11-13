import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitStore {
  [key: string]: {
    attempts: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private store: RateLimitStore = {};
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const key = `rate_limit:${ip}`;

    const now = Date.now();
    const record = this.store[key];

    if (!record) {
      this.store[key] = {
        attempts: 1,
        resetTime: now + this.windowMs,
      };
      return true;
    }

    if (now > record.resetTime) {
      // Reset the window
      this.store[key] = {
        attempts: 1,
        resetTime: now + this.windowMs,
      };
      return true;
    }

    if (record.attempts >= this.maxAttempts) {
      const resetTimeSeconds = Math.ceil((record.resetTime - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many login attempts. Try again in ${resetTimeSeconds} seconds.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.attempts++;
    return true;
  }

  // Clean up old entries periodically
  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    });
  }
}