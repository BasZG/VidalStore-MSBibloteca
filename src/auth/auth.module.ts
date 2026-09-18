import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy.js';
import { RolesGuard } from './roles.guard.js';
import { ScopesGuard } from './scopes.guard.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],
  providers: [
    JwtStrategy,
    RolesGuard,
    ScopesGuard,
  ],
  exports: [
    PassportModule,
    RolesGuard,
    ScopesGuard,
  ],
})
export class AuthModule {}
