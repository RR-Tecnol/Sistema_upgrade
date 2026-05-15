import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    @IsOptional()
    active?: boolean;
}
