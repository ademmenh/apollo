import { Module } from '@nestjs/common'
import { UserRepository } from './infrastructure/repository'
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password'
import { UsersResolver } from './presentation/resolver'
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
