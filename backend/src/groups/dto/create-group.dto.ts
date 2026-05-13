import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupDto {
    @ApiProperty({ example: 'Grupo 1 MA', description: 'Group name' })
    @IsString()
    @IsNotEmpty()
    @Length(3, 100)
    name: string;

    @ApiProperty({ example: 'MA', description: 'State code (MA or PI)' })
    @IsString()
    @IsNotEmpty()
    @Length(2, 2)
    state: string;
}
