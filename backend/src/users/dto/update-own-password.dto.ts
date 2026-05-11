import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateOwnPasswordDto {
    @ApiProperty({ description: 'Senha atual' })
    @IsString({ message: 'Senha atual deve ser texto' })
    @MinLength(1, { message: 'Informe a senha atual' })
    currentPassword: string;

    @ApiProperty({ description: 'Nova senha (mín. 6 caracteres)' })
    @IsString({ message: 'Nova senha deve ser texto' })
    @MinLength(6, { message: 'Nova senha deve ter pelo menos 6 caracteres' })
    newPassword: string;
}
