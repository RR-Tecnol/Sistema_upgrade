import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsHexColor, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateStockCategoryDto {
    @ApiProperty({ example: 'Brinquedos', description: 'Nome da categoria (único)' })
    @IsString()
    @Length(2, 60)
    nome: string;

    @ApiProperty({
        example: '🎁',
        description:
            'Ícone (emoji ou caractere curto até 4 chars) — fica como visual da categoria',
    })
    @IsString()
    @Length(1, 8)
    icon: string;

    @ApiProperty({ example: '#FF8C42', description: 'Cor em hex (#RRGGBB)' })
    @IsString()
    @IsHexColor()
    color: string;

    @ApiPropertyOptional({ example: 'Material lúdico para ações com crianças' })
    @IsString()
    @IsOptional()
    @Length(0, 300)
    description?: string;
}

export class UpdateStockCategoryDto extends PartialType(CreateStockCategoryDto) {
    @ApiPropertyOptional({ description: 'Soft delete / reativar — só admin' })
    @IsBoolean()
    @IsOptional()
    active?: boolean;
}
