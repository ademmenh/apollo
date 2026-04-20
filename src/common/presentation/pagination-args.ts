import { ArgsType, Field, Int } from '@nestjs/graphql'
import { IsInt, Min, Max } from 'class-validator'

@ArgsType()
export class PaginationArgs {
    @Field(() => Int, { defaultValue: 1, description: 'Page number' })
    @IsInt()
    @Min(1)
    page: number = 1

    @Field(() => Int, { defaultValue: 20, description: 'Items per page' })
    @IsInt()
    @Min(1)
    @Max(32)
    limit: number = 20
}
