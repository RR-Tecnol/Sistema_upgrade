import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

// Controllers
import { OrdemController } from './ordem/ordem.controller';
import { GateController } from './gate/gate.controller';
import { NcController } from './nc/nc.controller';
import { ApontamentoController } from './apontamento/apontamento.controller';
import { BomController } from './bom/bom.controller';
import { InsumosController } from './insumos/insumos.controller';
import { FuncionariosController } from './funcionarios/funcionarios.controller';
import { FornecedoresController } from './fornecedores/fornecedores.controller';
import { BiController } from './bi/bi.controller';
import { OperacoesController } from './operacoes/operacoes.controller';

// Services
import { OrdemService } from './ordem/ordem.service';
import { GateService } from './gate/gate.service';
import { NcService } from './nc/nc.service';
import { ApontamentoService } from './apontamento/apontamento.service';
import { BomService } from './bom/bom.service';
import { InsumosService } from './insumos/insumos.service';
import { FuncionariosService } from './funcionarios/funcionarios.service';
import { FornecedoresService } from './fornecedores/fornecedores.service';
import { BiService } from './bi/bi.service';
import { OperacoesService } from './operacoes/operacoes.service';

@Module({
  imports: [PrismaModule, NotificationsModule, AuditLogModule],
  controllers: [
    OrdemController,
    GateController,
    NcController,
    ApontamentoController,
    BomController,
    InsumosController,
    FuncionariosController,
    FornecedoresController,
    BiController,
    OperacoesController,
  ],
  providers: [
    OrdemService,
    GateService,
    NcService,
    ApontamentoService,
    BomService,
    InsumosService,
    FuncionariosService,
    FornecedoresService,
    BiService,
    OperacoesService,
  ],
  exports: [OrdemService],
})
export class FabricacaoModule {}
