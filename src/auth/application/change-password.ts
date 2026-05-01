import { Inject, Injectable } from '@nestjs/common'
import type { IUserRepository } from '../../users/domain/repository'
import type { IPasswordHasher } from '../domain/password-hasher'
import { Password } from '../../users/domain/password'
import { UserNotFoundError, InvalidCredentialsError } from '../domain/error'

@Injectable()
export class ChangePasswordUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
        @Inject('IPasswordHasher') private readonly passwordHasher: IPasswordHasher,
    ) { }

    async execute(id: string, oldPasswordRaw: string, newPasswordRaw: string): Promise<void> {
        const user = await this.userRepository.findById(id)
        if (!user) throw new UserNotFoundError()
        
        const isMatch = await user.getPassword().compare(oldPasswordRaw, this.passwordHasher)
        if (!isMatch) throw new InvalidCredentialsError() // Or define InvalidOldPasswordError
        
        const newPassword = await Password.create(newPasswordRaw, this.passwordHasher)
        user.changePassword(newPassword)
        await this.userRepository.update(user)
    }
}
