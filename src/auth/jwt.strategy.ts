import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly clientId: string;

  constructor(configService: ConfigService) {
    const region = configService.get<string>('COGNITO_REGION');
    const userPoolId = configService.get<string>('COGNITO_USER_POOL_ID');
    const clientId = configService.get<string>('COGNITO_CLIENT_ID');

    if (!region || !userPoolId || !clientId) {
      throw new Error('Faltan variables de configuración de Cognito');
    }

    const issuer =
      `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,

      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/.well-known/jwks.json`,
      }),

      issuer,
      algorithms: ['RS256'],
    });

    this.clientId = clientId;
  }

  validate(payload: any) {
    if (payload.token_use !== 'access') {
      throw new UnauthorizedException(
        'El token debe ser de tipo access',
      );
    }

    if (payload.client_id !== this.clientId) {
      throw new UnauthorizedException(
        'Token emitido para una aplicación no reconocida',
      );
    }

    return payload;
  }
}
