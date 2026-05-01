import { Module, forwardRef } from '@nestjs/common'
import { UserRepository } from './infrastructure/repository'
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password'
import { UsersResolver } from './presentation/resolver'
import { ProfileDataLoader } from './presentation/profile.dataloader'
import { GetProfilesByIdsUseCase } from './application/get-profiles-by-ids'
import { GetUsersByIdsUseCase } from './application/get-users-by-ids'
import { GetUsersUseCase } from './application/get-users'
import { GetUserUseCase } from './application/get-user'
import { FollowUserUseCase } from './application/follow-user'
import { GetFollowersUseCase } from './application/get-followers'
import { GetFollowingUseCase } from './application/get-following'
import { PostsModule } from '../posts/module'

@Module({
    imports: [forwardRef(() => PostsModule)],
    controllers: [],
    providers: [
        {
            provide: 'IUserRepository',
            useClass: UserRepository,
        },
        {
            provide: 'IPasswordHasher',
            useClass: BcryptPasswordHasher,
        },
        UsersResolver,
        ProfileDataLoader,
        GetProfilesByIdsUseCase,
        GetUsersByIdsUseCase,
        GetUsersUseCase,
        GetUserUseCase,
        FollowUserUseCase,
        GetFollowersUseCase,
        GetFollowingUseCase,
    ],
    exports: ['IUserRepository', 'IPasswordHasher', ProfileDataLoader],
})
export class UsersModule { }
