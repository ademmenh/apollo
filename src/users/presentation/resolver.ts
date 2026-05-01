import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { User } from '../domain/entity'
import { UserRDTO, ProfileRDTO } from '../../auth/presentation/auth.types'
import { ProfileDataLoader } from '../infrastructure/profile.dataloader'
import { ProfileNotFoundError } from '../domain/errors'
import { GetUsersUseCase } from '../application/get-users'
import { GetUserUseCase } from '../application/get-user'

@Resolver(() => UserRDTO)
export class UsersResolver {
    constructor(
        private readonly profileDataLoader: ProfileDataLoader,
        private readonly getUsersUseCase: GetUsersUseCase,
        private readonly getUserUseCase: GetUserUseCase,
    ) { }

    @Query(() => [UserRDTO], { name: 'users', description: 'Retrieve a list of all registered users' })
    async users(): Promise<UserRDTO[]> {
        const users = await this.getUsersUseCase.execute()
        return users.map(u => this.toResponse(u))
    }

    @Query(() => UserRDTO, { name: 'user', nullable: true, description: 'Retrieve a single user by their ID' })
    async user(@Args('id', { type: () => ID }) id: string): Promise<UserRDTO | null> {
        const user = await this.getUserUseCase.execute(id)
        if (!user) return null
        return this.toResponse(user)
    }

    private toResponse(u: User): UserRDTO {
        return {
            id: u.getId().getValue(),
            email: u.getEmail()?.getValue() || null,
            role: u.getRole() as any,
            createdAt: u.getCreatedAt(),
            profile: {
                id: u.getId().getValue(),
                fullName: u.getProfile().getFullName(),
                birthDate: u.getProfile().getBirthDate(),
                phoneNumber: u.getPhoneNumber()?.getValue() || null,
            }
        }
    }

    @ResolveField(() => ProfileRDTO, { description: 'The profile associated with the user' })
    async profile(@Parent() user: UserRDTO): Promise<ProfileRDTO> {
        if (user.profile) return user.profile
        const profile = await this.profileDataLoader.loader.load(user.id)
        if (!profile) throw new ProfileNotFoundError(user.id)
        return profile
    }
}
