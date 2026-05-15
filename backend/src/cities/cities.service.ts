import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

/** UF → nome do estado (como o Nominatim costuma devolver em address.state no Brasil). */
const BR_UF_NOME: Record<string, string> = {
    AC: 'Acre',
    AL: 'Alagoas',
    AP: 'Amapá',
    AM: 'Amazonas',
    BA: 'Bahia',
    CE: 'Ceará',
    DF: 'Distrito Federal',
    ES: 'Espírito Santo',
    GO: 'Goiás',
    MA: 'Maranhão',
    MT: 'Mato Grosso',
    MS: 'Mato Grosso do Sul',
    MG: 'Minas Gerais',
    PA: 'Pará',
    PB: 'Paraíba',
    PR: 'Paraná',
    PE: 'Pernambuco',
    PI: 'Piauí',
    RJ: 'Rio de Janeiro',
    RN: 'Rio Grande do Norte',
    RS: 'Rio Grande do Sul',
    RO: 'Rondônia',
    RR: 'Roraima',
    SC: 'Santa Catarina',
    SP: 'São Paulo',
    SE: 'Sergipe',
    TO: 'Tocantins',
};

function normalizeStateName(s: string): string {
    return s
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .trim();
}

@Injectable()
export class CitiesService {
    private readonly logger = new Logger(CitiesService.name);

    constructor(private prisma: PrismaService) { }

    async findAll(state?: string) {
        const where = state ? { state } : {};

        return this.prisma.city.findMany({
            where,
            orderBy: [
                { state: 'asc' },
                { name: 'asc' },
            ],
            include: {
                _count: {
                    select: {
                        classes: true,
                    },
                },
            },
        });
    }

    async findOne(id: string) {
        const city = await this.prisma.city.findUnique({
            where: { id },
            include: {
                classes: {
                    include: {
                        course: true,
                    },
                    orderBy: { startDate: 'desc' },
                    take: 10,
                },
                _count: {
                    select: {
                        classes: true,
                        tripsOrigin: true,
                        tripsDestination: true,
                    },
                },
            },
        });

        if (!city) {
            throw new NotFoundException('City not found');
        }

        return city;
    }

    async create(data: CreateCityDto) {
        // Check if city already exists
        const existing = await this.prisma.city.findFirst({
            where: { name: data.name, state: data.state },
        });
        if (existing) throw new ConflictException('City already exists in this state');

        // F1.5: Geocodificar via Nominatim se lat/lng não fornecidos
        let latitude = data.latitude ?? null;
        let longitude = data.longitude ?? null;
        if (latitude == null || longitude == null) {
            const coords = await this.geocodeCity(data.name, data.state);
            if (coords) { latitude = coords.lat; longitude = coords.lng; }
        }

        return this.prisma.city.create({ data: { ...data, latitude, longitude } });
    }

    async update(id: string, data: UpdateCityDto) {
        await this.findOne(id);

        // Check for duplicate if name or state is being changed
        if (data.name || data.state) {
            const existing = await this.prisma.city.findFirst({
                where: {
                    name: data.name,
                    state: data.state,
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictException('City already exists in this state');
            }
        }

        return this.prisma.city.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        await this.findOne(id);

        // Check if city has classes
        const classCount = await this.prisma.class.count({
            where: { cityId: id },
        });

        if (classCount > 0) {
            throw new ConflictException('Cannot delete city with existing classes');
        }

        return this.prisma.city.delete({
            where: { id },
        });
    }

    async findByState(state: string) {
        return this.prisma.city.findMany({
            where: { state },
            orderBy: { name: 'asc' },
        });
    }

    // F1.5: Geocodificação via Nominatim (OpenStreetMap) — gratuito, sem chave de API
    // REGRA: chamar APENAS no backend. Nunca expor ao frontend.
    // LGPD: envia apenas nome da cidade e estado — zero dados pessoais.
    // Resultado salvo no banco: próximas buscas usam o banco, nunca o Nominatim.
    async geocodeCity(name: string, state: string): Promise<{ lat: number; lng: number } | null> {
        try {
            const encoded = encodeURIComponent(name);
            const url = `https://nominatim.openstreetmap.org/search?city=${encoded}&state=${encodeURIComponent(state)}&country=Brazil&format=json&limit=1`;
            const res = await fetch(url, {
                headers: {
                    // Nominatim exige User-Agent identificando o app (obrigatório pela política de uso)
                    'User-Agent': 'SistemaUpgrade/2.0 (admin@qualifica.com)',
                    'Accept-Language': 'pt-BR',
                },
            });
            if (!res.ok) return null;
            const data: any[] = await res.json();
            if (!data.length) return null;
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } catch (err) {
            this.logger.warn(`Nominatim geocode falhou para ${name}/${state}: ${err}`);
            return null;
        }
    }

    // REQ-LOCAL-2026: Geocodificação livre de endereço (rua, número, bairro, cidade, UF).
    // SEGURANÇA:
    //   - Chamado apenas via endpoint autenticado (JWT + ADMIN/COORDINATOR)
    //   - Sanitização completa antes de enviar ao Nominatim
    //   - User-Agent identificador do app (obrigatório pela política Nominatim)
    //   - Resultado filtrado: retorna apenas {lat, lng, displayName} — nunca o JSON bruto
    async geocodeAddress(
        query: string,
        ufHint?: string,
    ): Promise<{ lat: number; lng: number; displayName: string } | null> {
        if (!query) return null;

        // ── Sanitização do input ────────────────────────────────────────────
        // 1. Remover caracteres de controle (ASCII 0-31 exceto espaço)
        // 2. Remover tags HTML residuais
        // 3. Normalizar espaços múltiplos
        // 4. Validar tamanho mínimo e máximo
        const sanitized = query
            .replace(/[\x00-\x1F\x7F]/g, '')      // controle
            .replace(/<[^>]*>/g, '')                // HTML tags
            .replace(/['"`;]/g, '')                 // SQL/JS injection chars
            .replace(/\s+/g, ' ')                   // espaços múltiplos
            .trim()
            .slice(0, 300);                         // limite máximo

        if (sanitized.length < 4) return null;

        // Garantir que tem ao menos algum conteúdo alfanumérico (não apenas símbolos)
        if (!/[a-zA-ZÀ-ÿ0-9]/.test(sanitized)) return null;

        const ufUpper = ufHint?.trim()?.toUpperCase();
        const wantStateNorm =
            ufUpper && /^[A-Z]{2}$/.test(ufUpper) && BR_UF_NOME[ufUpper]
                ? normalizeStateName(BR_UF_NOME[ufUpper])
                : null;

        try {
            const encoded = encodeURIComponent(sanitized);
            const limit = wantStateNorm ? 15 : 1;
            const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&countrycodes=br&format=json&limit=${limit}&addressdetails=1`;
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'SistemaUpgrade/2.0 (admin@qualifica.com)',
                    'Accept-Language': 'pt-BR',
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(8000), // timeout de 8s — evita hang
            });
            if (!res.ok) return null;
            const data: any[] = await res.json();
            if (!Array.isArray(data) || !data.length) return null;

            let chosen = data[0];
            if (wantStateNorm) {
                const inUf = data.filter((row) => {
                    const st = normalizeStateName(String(row.address?.state ?? ''));
                    return st === wantStateNorm;
                });
                if (inUf.length) {
                    chosen = inUf[0];
                }
            }

            const r = chosen;
            // Validar que lat/lng são números válidos antes de retornar
            const lat = parseFloat(r.lat);
            const lng = parseFloat(r.lon);
            if (isNaN(lat) || isNaN(lng)) return null;
            // Sanitizar displayName antes de retornar ao frontend
            const displayName = String(r.display_name ?? sanitized)
                .replace(/<[^>]*>/g, '')
                .slice(0, 200);
            return { lat, lng, displayName };
        } catch (err) {
            this.logger.warn(`Nominatim geocodeAddress falhou para "${sanitized}": ${err}`);
            return null;
        }
    }
}
