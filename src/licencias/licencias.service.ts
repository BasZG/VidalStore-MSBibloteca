import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Licencia } from './models/licencia.model.js';

@Injectable()
export class LicenciasService {
  private readonly licencias: Licencia[] = [];

  crear(juegoId: string, usuarioSub: string): Licencia {
    const licencia: Licencia = {
      id: randomUUID(),
      juegoId,
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
