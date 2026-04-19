import { Parent, ResolveField, Resolver } from '@nestjs/graphql'
import { UserRDTO, ProfileRDTO } from '../../auth/presentation/auth.types'
import { ProfileDataLoader } from '../infrastructure/profile.dataloader'

@Resolver(() => UserRDTO)
export class UsersResolver {
    constructor(private readonly profileDataLoader: ProfileDataLoader) { }

    @ResolveField(() => ProfileRDTO)
    async profile(@Parent() user: UserRDTO): Promise<ProfileRDTO> {
        if (user.profile) return user.profile
        return this.profileDataLoader.loader.load(user.id)
    }
}
