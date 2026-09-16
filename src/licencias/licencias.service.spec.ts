import { Test, TestingModule } from '@nestjs/testing';
import { LicenciasService } from './licencias.service.js';

describe('LicenciasService', () => {
  let service: LicenciasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LicenciasService],
    }).compile();

    service = module.get<LicenciasService>(LicenciasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
