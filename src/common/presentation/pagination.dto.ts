import { IsInt, IsNotEmpty, IsNumber, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class PaginationDto {
    @ApiPropertyOptional({ default: 1, description: 'Page number' })
    @IsNotEmpty()
    @IsInt()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page: number = 1

    @ApiPropertyOptional({ default: 20, description: 'Items per page' })
    @IsNotEmpty()
    @IsInt()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(32)
    limit: number = 20
}
