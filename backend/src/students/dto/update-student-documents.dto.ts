import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

/** Merge de URLs de documentação do aluno (chaves: photo, identidade, addressProof, …). */
export class UpdateStudentDocumentsDto {
    @ApiProperty({
        example: { photo: 'https://...', identidade: 'https://...' },
        description: 'Valores são fundidos aos já gravados; só chaves conhecidas são aceites.',
    })
    @IsObject()
    documents!: Record<string, unknown>;
}
