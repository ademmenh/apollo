import { Module } from '@nestjs/common'
import { UserRepository } from './infrastructure/repository'
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password'
import { UsersResolver } from './presentation/resolver'
import { ProfileDataLoader } from './infrastructure/profile.dataloader'
import { GetProfilesByIdsUseCase } from './application/get-profiles-by-ids'
import { GetUsersUseCase } from './application/get-users'
import { GetUserUseCase } from './application/get-user'

@Module({
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
        GetUsersUseCase,
        GetUserUseCase,
    ],
    exports: ['IUserRepository', 'IPasswordHasher'],
})
export class UsersModule { }
