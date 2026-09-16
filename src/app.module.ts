import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LicenciasModule } from './licencias/licencias.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LicenciasModule,
  ],
})
export class AppModule {}
