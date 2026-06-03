import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BomService {
  constructor(private readonly prisma: PrismaService) {}

  async findTemplates() {
    return this.prisma.bomTemplate.findMany({
      where: { ativo: true },
      include: { itens: { include: { insumo: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneTemplate(id: string) {
    return this.prisma.bomTemplate.findUnique({
      where: { id },
      include: { itens: { include: { insumo: true } } },
    });
  }
}
