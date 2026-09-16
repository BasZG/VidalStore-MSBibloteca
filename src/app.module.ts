import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { LicenciasModule } from './licencias/licencias.module.js';

@Module({
  imports: [LicenciasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}