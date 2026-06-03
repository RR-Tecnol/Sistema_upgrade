import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FuncionariosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna funcionários ativos.
   * Se ordemId for passado, filtra apenas os vinculados àquela OF.
   */
  async findAll(ordemId?: string) {
    if (ordemId) {
      const vinculos = await this.prisma.funcionarioOfVinculo.findMany({
        where: { ordemId },
        include: { funcionario: true },
        distinct: ['funcionarioId'],
      });
      return vinculos
        .filter(v => v.funcionario?.active)
        .map(v => v.funcionario);
    }

    return this.prisma.funcionarioProducao.findMany({
      where: { active: true },
      orderBy: { nome: 'asc' },
    });
  }
}
