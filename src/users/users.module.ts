import { Module } from '@nestjs/common'
import { UserRepository } from './infrastructure/persistence/user.repository'
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher'
import { UsersResolver } from './presentation/users.resolver'
import { ProfileDataLoader } from './infrastructure/profile.dataloader'

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
    ],
    exports: ['IUserRepository', 'IPasswordHasher'],
})
export class UsersModule { }
