import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstitutionsService {
  private cacheDefaultId: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Instituição padrão (slug `upgrade`) — usada em create de Course se não enviado institutionId.
   */
  async getDefaultInstitutionId(): Promise<string> {
    if (this.cacheDefaultId) {
      return this.cacheDefaultId;
    }
    const row = await this.prisma.institution.findUnique({ where: { slug: 'upgrade' } });
    if (!row) {
      throw new ServiceUnavailableException(
        'Instituição padrão (slug upgrade) em falta. Execute o seed / INSERT em institutions.',
      );
    }
    this.cacheDefaultId = row.id;
    return row.id;
  }
}
