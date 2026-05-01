import { Inject, Injectable } from '@nestjs/common'
import type { IUserRepository } from '../../users/domain/repository'
import type { IPasswordHasher } from '../domain/password-hasher'
import { Password } from '../../users/domain/password'
import {
    ResetRequestNotFoundError,
    TooManyAttemptsError,
    InvalidCodeError,
    UserNotFoundError
} from '../domain/error'

@Injectable()
export class ForgotPasswordResetUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
        @Inject('IPasswordHasher') private readonly passwordHasher: IPasswordHasher,
    ) { }

    async execute(id: string, secret: string, newPasswordRaw: string): Promise<void> {
        const secretData = await this.userRepository.getForgotPasswordSecret(id)
        if (!secretData) throw new ResetRequestNotFoundError()

        if (secretData.attempts <= 0) {
            await this.userRepository.removeForgotPasswordSecret(id)
            throw new TooManyAttemptsError()
        }

        const isMatch = await this.passwordHasher.compare(secret, secretData.codeHash)
        if (!isMatch) {
            await this.userRepository.setForgotPasswordSecret(id, secretData.codeHash, secretData.code, secretData.attempts - 1)
            throw new InvalidCodeError(secretData.attempts - 1)
        }

        const user = await this.userRepository.findById(id)
        if (!user) throw new UserNotFoundError()

        const newPassword = await Password.create(newPasswordRaw, this.passwordHasher)
        user.changePassword(newPassword)
        await this.userRepository.update(user)
    }
}
