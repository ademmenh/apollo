import { Query, Resolver } from '@nestjs/graphql'

@Resolver(() => String)
export class AppResolver {
    @Query(() => String)
    healthCheck(): string {
        return 'ok'
    }
}
