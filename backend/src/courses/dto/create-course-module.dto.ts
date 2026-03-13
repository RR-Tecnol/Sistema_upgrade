import { IsString, IsNotEmpty, IsInt, Min, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseModuleDto {
    @ApiProperty({ example: 'Introdução ao Windows', description: 'Module name' })
    @IsString()
    @IsNotEmpty()
    @Length(3, 200)
    moduleName: string;

    @ApiProperty({ example: 1, description: 'Room number' })
    @IsInt()
    @Min(1)
    room: number;

    @ApiProperty({ example: '08:00', description: 'Start time (HH:mm)' })
    @IsString()
    @IsNotEmpty()
    startTime: string;

    @ApiProperty({ example: '12:00', description: 'End time (HH:mm)' })
    @IsString()
    @IsNotEmpty()
    endTime: string;

    @ApiProperty({ example: 1, description: 'Module order' })
    @IsInt()
    @Min(1)
    order: number;
}
