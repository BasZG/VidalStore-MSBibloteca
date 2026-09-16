import { Module } from '@nestjs/common';
import { LicenciasService } from './licencias.service.js';

@Module({
  providers: [LicenciasService],
})
export class LicenciasModule {}