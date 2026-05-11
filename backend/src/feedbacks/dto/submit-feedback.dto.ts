import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min, MinLength } from 'class-validator';
import { FeedbackCurrentStatus, PixKeyType } from '@prisma/client';

export class SubmitFeedbackDto {
    @ApiProperty({ minimum: 1, maximum: 5 })
    @IsInt() @Min(1) @Max(5)
    ratingCourse: number;

    @ApiProperty({ minimum: 1, maximum: 5 })
    @IsInt() @Min(1) @Max(5)
    ratingSystem: number;

    @ApiProperty({ minimum: 1, maximum: 5 })
    @IsInt() @Min(1) @Max(5)
    ratingManagement: number;

    @ApiProperty({ minimum: 1, maximum: 5 })
    @IsInt() @Min(1) @Max(5)
    ratingTeachers: number;

    @ApiProperty({ minimum: 1, maximum: 5 })
    @IsInt() @Min(1) @Max(5)
    ratingGeneral: number;

    @ApiProperty({ description: 'O que mais gostou (obrigatório)', minLength: 5 })
    @IsString() @IsNotEmpty() @MinLength(5)
    commentPositive: string;

    @ApiProperty({ description: 'O que pode melhorar (obrigatório)', minLength: 5 })
    @IsString() @IsNotEmpty() @MinLength(5)
    commentImprovement: string;

    @ApiProperty({ description: 'Comentário geral (obrigatório)', minLength: 5 })
    @IsString() @IsNotEmpty() @MinLength(5)
    commentGeneral: string;

    @ApiProperty({ enum: FeedbackCurrentStatus })
    @IsEnum(FeedbackCurrentStatus)
    currentStatus: FeedbackCurrentStatus;

    @ApiProperty({ description: 'Detalhes da situação atual (obrigatório, ex: empresa, curso, cargo)', minLength: 3 })
    @IsString() @IsNotEmpty() @MinLength(3)
    currentStatusDetails: string;

    @ApiProperty({ description: 'URL MinIO da foto (obrigatória)' })
    @IsString() @IsNotEmpty()
    currentPhotoUrl: string;

    @ApiProperty({ description: 'URL MinIO do vídeo (obrigatório)' })
    @IsString() @IsNotEmpty()
    currentVideoUrl: string;

    @ApiProperty({ enum: PixKeyType })
    @IsEnum(PixKeyType)
    pixKeyType: PixKeyType;

    @ApiProperty({ example: '12345678900 ou email@ex.com ou 11999999999' })
    @IsString() @MinLength(3)
    pixKey: string;

    @ApiProperty({ description: 'Confirma divulgação (clique em LinkedIn e/ou WhatsApp) — obrigatório para o prêmio PIX' })
    @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
    @IsBoolean()
    @IsIn([true], { message: 'É necessário divulgar o certificado nas redes para submeter o feedback' })
    sharedOnSocial: boolean;

    @ApiProperty({ description: 'Plataforma onde o aluno postou', enum: ['LINKEDIN', 'WHATSAPP'] })
    @IsString()
    @IsIn(['LINKEDIN', 'WHATSAPP'], { message: 'Plataforma deve ser LINKEDIN ou WHATSAPP' })
    socialPostPlatform: 'LINKEDIN' | 'WHATSAPP';

    @ApiPropertyOptional({ description: 'URL do post real (obrigatório p/ LinkedIn; opcional p/ WhatsApp Status)' })
    @IsOptional()
    @IsString()
    @IsUrl({}, { message: 'URL do post inválida' })
    socialPostUrl?: string;

    @ApiProperty({ description: 'MinIO key do screenshot/print do post (obrigatório)' })
    @IsString() @IsNotEmpty()
    socialPostProofUrl: string;
}
