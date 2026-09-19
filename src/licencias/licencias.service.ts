import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Licencia } from './models/licencia.model.js';

@Injectable()
export class LicenciasService {
  private readonly licencias: Licencia[] = [];

  crear(juegoId: string, usuarioSub: string): Licencia {
    if (typeof juegoId !== 'string') {
      throw new BadRequestException('juegoId debe ser string');
    }

    const juegoIdNormalizado = juegoId.trim();

    if (!juegoIdNormalizado) {
      throw new BadRequestException('juegoId es obligatorio');
    }

    const licenciaExistente = this.licencias.some(
      (licencia) =>
        licencia.usuarioSub === usuarioSub &&
        licencia.juegoId === juegoIdNormalizado,
    );

    if (licenciaExistente) {
      throw new ConflictException('LICENCIA_YA_EXISTE');
    }

    const licencia: Licencia = {
      id: randomUUID(),
      juegoId: juegoIdNormalizado,
      usuarioSub,
      fechaCreacion: new Date().toISOString(),
    };

    this.licencias.push(licencia);

    return licencia;
  }

  obtenerPorUsuario(usuarioSub: string): Licencia[] {
    return this.licencias.filter(
      (licencia) => licencia.usuarioSub === usuarioSub,
    );
  }

  obtenerTodas(): Licencia[] {
    return this.licencias;
  }

  revocar(licenciaId: string): Licencia {
    const indice = this.licencias.findIndex(
      (licencia) => licencia.id === licenciaId,
    );

    if (indice === -1) {
      throw new NotFoundException('Licencia no encontrada');
    }

    const [licenciaRevocada] = this.licencias.splice(indice, 1);

    return licenciaRevocada;
  }
}
