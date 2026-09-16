import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from './scopes.decorator.js';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      SCOPES_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ],
    );

    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const tokenScopes =
      typeof request.user?.scope === 'string'
        ? request.user.scope.split(' ')
        : [];

    const autorizado = requiredScopes.every((scope) =>
      tokenScopes.includes(scope),
    );

    if (!autorizado) {
      throw new ForbiddenException(
        'El token no posee el scope requerido',
      );
    }

    return true;
  }
}

