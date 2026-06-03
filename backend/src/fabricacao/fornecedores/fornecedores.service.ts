import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FornecedoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrdem(ordemId: string) {
    return this.prisma.fornecedorOf.findMany({
      where: { ordemId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
