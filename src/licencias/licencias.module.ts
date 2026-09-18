import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LicenciasController } from './licencias.controller.js';
import { LicenciasService } from './licencias.service.js';

@Module({
  imports: [AuthModule],
  controllers: [LicenciasController],
  providers: [LicenciasService],
})
export class LicenciasModule {}