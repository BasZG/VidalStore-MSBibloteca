import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Scopes } from '../auth/scopes.decorator.js';
import { ScopesGuard } from '../auth/scopes.guard.js';
import { CrearCompraDto } from './dto/crear-compra.dto.js';
import { LicenciasService } from './licencias.service.js';

@Controller('v1')
export class LicenciasController {
  constructor(
    private readonly licenciasService: LicenciasService,
  ) {}

  @Post('compras')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @Scopes('vidalstore/biblioteca.leer')
  crearCompra(
    @Body() dto: CrearCompraDto,
    @Req() req: any,
  ) {
    if (
      dto === null ||
      typeof dto !== 'object' ||
      Array.isArray(dto)
    ) {
      throw new BadRequestException(
        'El body debe ser un objeto válido',
      );
    }

    return this.licenciasService.crear(
      dto.juegoId,
      req.user.sub,
    );
  }

  @Get('biblioteca')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @Scopes('vidalstore/biblioteca.leer')
  obtenerBiblioteca(@Req() req: any) {
    return this.licenciasService.obtenerPorUsuario(
      req.user.sub,
    );
  }

  @Get('licencias')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administradores')
  obtenerLicencias() {
    return this.licenciasService.obtenerTodas();
  }

  @Delete('licencias/:licenciaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administradores')
  revocarLicencia(
    @Param('licenciaId') licenciaId: string,
  ) {
    return this.licenciasService.revocar(licenciaId);
  }
}