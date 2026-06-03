import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OperacoesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrdem(ordemId: string) {
    return this.prisma.operacaoProducao.findMany({
      where: { ordemId },
      orderBy: { ordemNumero: 'asc' },
      include: { gateRegistro: true },
    });
  }
}
