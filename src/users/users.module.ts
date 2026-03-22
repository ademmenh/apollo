import { Module } from '@nestjs/common'
import { UserRepository } from './infrastructure/persistence/user.repository'
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher'

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
    ],
    exports: ['IUserRepository', 'IPasswordHasher'],
})
export class UsersModule { }
