"""
Patch script: adiciona campos de routeType no schema.prisma, DTOs e types.
Execute com: python _patch_route_type.py
"""
import re, os, sys

BASE = r"C:\Users\Desktop\Downloads\Sistema_upgrade-main_atual"

def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()

def write(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  [OK] {os.path.basename(path)}")

def patch(content, old, new, label=""):
    if old not in content:
        print(f"  [WARN] anchor not found: {label}")
        return content
    return content.replace(old, new, 1)

# ── 1. PRISMA SCHEMA ─────────────────────────────────────────────────────────
print("\n=== schema.prisma ===")
schema_path = os.path.join(BASE, "backend", "prisma", "schema.prisma")
s = read(schema_path)

# City: add reverse relations
s = patch(s,
    '  // Relations\n  classes          Class[]\n  tripsOrigin      Trip[]  @relation("TripOrigin")\n  tripsDestination Trip[]  @relation("TripDestination")\n  acoes            Acao[]',
    '  // Relations\n  classes          Class[]\n  classesAsOrigin  Class[]  @relation("ClassOriginCity")\n  tripsOrigin      Trip[]  @relation("TripOrigin")\n  tripsDestination Trip[]  @relation("TripDestination")\n  acoes            Acao[]\n  acoesAsOrigin    Acao[]  @relation("AcaoOriginCity")',
    "City relations"
)

# Class model: replace old location block + relations with new block including routeType fields
old_class_block = (
    '  // ── Local específico onde a turma ocorre fisicamente (REQ-LOCAL-2026) ──\n'
    '  // Campos opcionais para não quebrar dados existentes. Devem ser preenchidos\n'
    '  // pelo admin para que o motorista (Trip) e o aluno (cursos públicos) saibam\n'
    '  // exactamente onde ir, com endereço estruturado e GPS.\n'
    '  locationName         String?     // Ex: "Escola Municipal Castro Alves"\n'
    '  locationAddress      String?     // Ex: "Rua das Flores, 123 - Centro"\n'
    '  locationReference    String?     // Ex: "Próximo ao mercado, portão azul"\n'
    '  locationLatitude     Float?      // GPS — pode ser preenchido via Nominatim ou manual\n'
    '  locationLongitude    Float?\n'
    '  createdAt            DateTime    @default(now())\n'
    '  updatedAt            DateTime    @updatedAt\n'
    '\n'
    '  // Relations\n'
    '  course      Course           @relation(fields: [courseId], references: [id])\n'
    '  group       Group            @relation(fields: [groupId], references: [id])\n'
    '  city        City             @relation(fields: [cityId], references: [id])\n'
    '  truck       Truck?           @relation(fields: [truckId], references: [id])'
)
new_class_block = (
    '  // ── Tipo de rota (REQ-ROUTE-2026) ──────────────────────────────────────────\n'
    '  // INTERCIDADE: Carreta parte de originCity e opera em city (destino).\n'
    '  // INTRAURBANA: curso dentro da mesma cidade; originNeighborhood → destinationNeighborhood.\n'
    '  routeType               String    @default("INTERCIDADE") // "INTERCIDADE" | "INTRAURBANA"\n'
    '  originCityId            String?   // Cidade de origem (apenas intercidade)\n'
    '  originNeighborhood      String?   // Bairro/ponto de partida (apenas intraurbana)\n'
    '  destinationNeighborhood String?   // Bairro/ponto de chegada (apenas intraurbana)\n'
    '  // ── Local específico onde a turma ocorre fisicamente (REQ-LOCAL-2026) ──\n'
    '  locationName         String?\n'
    '  locationAddress      String?\n'
    '  locationReference    String?\n'
    '  locationLatitude     Float?\n'
    '  locationLongitude    Float?\n'
    '  createdAt            DateTime    @default(now())\n'
    '  updatedAt            DateTime    @updatedAt\n'
    '\n'
    '  // Relations\n'
    '  course      Course           @relation(fields: [courseId], references: [id])\n'
    '  group       Group            @relation(fields: [groupId], references: [id])\n'
    '  city        City             @relation(fields: [cityId], references: [id])\n'
    '  originCity  City?            @relation("ClassOriginCity", fields: [originCityId], references: [id])\n'
    '  truck       Truck?           @relation(fields: [truckId], references: [id])'
)
s = patch(s, old_class_block, new_class_block, "Class block")

# Acao model: add route fields after distanciaKm block
old_acao_block = (
    '  distanciaKm         Decimal?   @db.Decimal(10, 2)\n'
    '  precoCombustivelL   Decimal?   @db.Decimal(10, 2)\n'
    '  autonomiaKmL        Decimal?   @db.Decimal(10, 2)\n'
    '  observacoes         String?\n'
    '  permitirInscricoes  Boolean    @default(true)\n'
    '  createdAt           DateTime   @default(now())\n'
    '  updatedAt           DateTime   @updatedAt\n'
    '\n'
    '  // Relations\n'
    '  cidade  City?  @relation(fields: [cidadeId], references: [id], onDelete: SetNull)\n'
    '  grupo   Group  @relation(fields: [grupoId], references: [id])\n'
    '  carreta Truck? @relation("TruckAcoes", fields: [carretaId], references: [id])'
)
new_acao_block = (
    '  distanciaKm         Decimal?   @db.Decimal(10, 2)\n'
    '  precoCombustivelL   Decimal?   @db.Decimal(10, 2)\n'
    '  autonomiaKmL        Decimal?   @db.Decimal(10, 2)\n'
    '  // ── Tipo de rota (REQ-ROUTE-2026) ──────────────────────────────────────────\n'
    '  routeType               String    @default("INTERCIDADE") // "INTERCIDADE" | "INTRAURBANA"\n'
    '  originCidadeId          String?   // Cidade de origem (apenas intercidade)\n'
    '  originNeighborhood      String?   // Bairro/ponto de partida (apenas intraurbana)\n'
    '  destinationNeighborhood String?   // Bairro/ponto de chegada (apenas intraurbana)\n'
    '  observacoes         String?\n'
    '  permitirInscricoes  Boolean    @default(true)\n'
    '  createdAt           DateTime   @default(now())\n'
    '  updatedAt           DateTime   @updatedAt\n'
    '\n'
    '  // Relations\n'
    '  cidade        City?  @relation(fields: [cidadeId], references: [id], onDelete: SetNull)\n'
    '  originCidade  City?  @relation("AcaoOriginCity", fields: [originCidadeId], references: [id])\n'
    '  grupo         Group  @relation(fields: [grupoId], references: [id])\n'
    '  carreta       Truck? @relation("TruckAcoes", fields: [carretaId], references: [id])'
)
s = patch(s, old_acao_block, new_acao_block, "Acao block")

write(schema_path, s)

# ── 2. BACKEND DTO: create-class.dto.ts ──────────────────────────────────────
print("\n=== create-class.dto.ts ===")
dto_class_path = os.path.join(BASE, "backend", "src", "classes", "dto", "create-class.dto.ts")
d = read(dto_class_path)
route_fields = """
    // ── Tipo de rota (REQ-ROUTE-2026) ─────────────────────────────────────────
    @ApiPropertyOptional({ example: 'INTERCIDADE', enum: ['INTERCIDADE', 'INTRAURBANA'] })
    @IsString()
    @IsOptional()
    routeType?: 'INTERCIDADE' | 'INTRAURBANA';

    @ApiPropertyOptional({ example: 'uuid-cidade-origem', description: 'Cidade de origem (intercidade)' })
    @IsString()
    @IsOptional()
    originCityId?: string;

    @ApiPropertyOptional({ example: 'Alto do Calhau', description: 'Bairro/ponto de partida (intraurbana)' })
    @IsString()
    @IsOptional()
    originNeighborhood?: string;

    @ApiPropertyOptional({ example: 'Forquilha', description: 'Bairro/ponto de chegada (intraurbana)' })
    @IsString()
    @IsOptional()
    destinationNeighborhood?: string;

"""
anchor = "    // ── Local específico onde a turma ocorre fisicamente (REQ-LOCAL-2026) ──"
d = patch(d, anchor, route_fields + anchor, "DTO route fields")
write(dto_class_path, d)

# ── 3. BACKEND DTO: create-acao.dto.ts ───────────────────────────────────────
print("\n=== create-acao.dto.ts ===")
dto_acao_path = os.path.join(BASE, "backend", "src", "acoes", "dto", "create-acao.dto.ts")
a = read(dto_acao_path)
acao_route_fields = """
    // ── Tipo de rota (REQ-ROUTE-2026) ─────────────────────────────────────────
    @ApiPropertyOptional({ example: 'INTERCIDADE', enum: ['INTERCIDADE', 'INTRAURBANA'] })
    @IsOptional()
    @IsString()
    routeType?: 'INTERCIDADE' | 'INTRAURBANA';

    @ApiPropertyOptional({ example: 'uuid-cidade-origem', description: 'Cidade de origem (intercidade)' })
    @IsOptional()
    @IsString()
    originCidadeId?: string;

    @ApiPropertyOptional({ example: 'Alto do Calhau' })
    @IsOptional()
    @IsString()
    originNeighborhood?: string;

    @ApiPropertyOptional({ example: 'Forquilha' })
    @IsOptional()
    @IsString()
    destinationNeighborhood?: string;

"""
anchor_acao = "    @ApiPropertyOptional({ example: 350 })"
a = patch(a, anchor_acao, acao_route_fields + anchor_acao, "Acao DTO route fields")
write(dto_acao_path, a)

# ── 4. BACKEND SERVICE: acoes.service.ts — add route fields to create() ──────
print("\n=== acoes.service.ts ===")
svc_path = os.path.join(BASE, "backend", "src", "acoes", "acoes.service.ts")
sv = read(svc_path)
old_create = "                localLatitude: data.localLatitude,\n                localLongitude: data.localLongitude,"
new_create = (
    "                localLatitude: data.localLatitude,\n"
    "                localLongitude: data.localLongitude,\n"
    "                // ── Tipo de rota (REQ-ROUTE-2026) ──\n"
    "                routeType: data.routeType ?? 'INTERCIDADE',\n"
    "                originCidadeId: data.originCidadeId,\n"
    "                originNeighborhood: data.originNeighborhood,\n"
    "                destinationNeighborhood: data.destinationNeighborhood,"
)
sv = patch(sv, old_create, new_create, "acoes.service create()")
write(svc_path, sv)

# ── 5. FRONTEND: lib/api/classes.ts ──────────────────────────────────────────
print("\n=== frontend/lib/api/classes.ts ===")
api_class_path = os.path.join(BASE, "frontend", "lib", "api", "classes.ts")
ac = read(api_class_path)
route_interface_fields = (
    "    // ── Tipo de rota (REQ-ROUTE-2026)\n"
    "    routeType?: 'INTERCIDADE' | 'INTRAURBANA';\n"
    "    originCityId?: string;\n"
    "    originCity?: { id: string; name: string; state: string };\n"
    "    originNeighborhood?: string;\n"
    "    destinationNeighborhood?: string;\n"
)
# Add to Class interface after enrollmentCloseDate
ac = patch(ac,
    "    enrollmentCloseDate?: string;\n    createdAt: string;",
    "    enrollmentCloseDate?: string;\n" + route_interface_fields + "    createdAt: string;",
    "Class interface fields"
)
# Add to CreateClassDto after enrollmentCloseDate
ac = patch(ac,
    "    enrollmentCloseDate?: string;\n    // ── Local físico (REQ-LOCAL-2026)",
    "    enrollmentCloseDate?: string;\n"
    "    // ── Tipo de rota (REQ-ROUTE-2026)\n"
    "    routeType?: 'INTERCIDADE' | 'INTRAURBANA';\n"
    "    originCityId?: string;\n"
    "    originNeighborhood?: string;\n"
    "    destinationNeighborhood?: string;\n"
    "    // ── Local físico (REQ-LOCAL-2026)",
    "CreateClassDto fields"
)
write(api_class_path, ac)

# ── 6. FRONTEND: lib/api/acoes.ts ────────────────────────────────────────────
print("\n=== frontend/lib/api/acoes.ts ===")
api_acao_path = os.path.join(BASE, "frontend", "lib", "api", "acoes.ts")
aa = read(api_acao_path)
aa = patch(aa,
    "    // ── Detalhes do local físico (REQ-LOCAL-2026) ──\n    localEndereco?: string;",
    "    // ── Tipo de rota (REQ-ROUTE-2026) ──\n"
    "    routeType?: 'INTERCIDADE' | 'INTRAURBANA';\n"
    "    originCidadeId?: string;\n"
    "    originCidade?: { id: string; name: string; state: string };\n"
    "    originNeighborhood?: string;\n"
    "    destinationNeighborhood?: string;\n"
    "    // ── Detalhes do local físico (REQ-LOCAL-2026) ──\n"
    "    localEndereco?: string;",
    "Acao interface fields"
)
write(api_acao_path, aa)

print("\n✅ Todos os patches aplicados com sucesso!")
