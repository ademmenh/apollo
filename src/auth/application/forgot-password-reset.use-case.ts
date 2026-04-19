import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { IUserRepository } from '../../users/domain/user-repository.interface'
import type { IPasswordHasher } from '../domain/password-hasher.interface'
import { Password } from '../../users/domain/value-objects/password.vo'

@Injectable()
export class ForgotPasswordResetUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
        @Inject('IPasswordHasher') private readonly passwordHasher: IPasswordHasher,
    ) { }

    async execute(id: string, secret: string, newPasswordRaw: string): Promise<void> {
        const secretData = await this.userRepository.getForgotPasswordSecret(id)
        if (!secretData) throw new NotFoundException('Reset request not found or expired')
        if (secretData.attempts <= 0) {
            await this.userRepository.removeForgotPasswordSecret(id)
            throw new BadRequestException('Too many failed attempts')
        }
        const isMatch = await this.passwordHasher.compare(secret, secretData.codeHash)
        if (!isMatch) {
            await this.userRepository.saveForgotPasswordSecret(id, secretData.codeHash, secretData.code, secretData.attempts - 1, { type: 'NONE', payload: {} })
            throw new BadRequestException('Invalid secret code')
        }
        const user = await this.userRepository.findById(id)
        if (!user) throw new NotFoundException('User not found')
        const newPassword = await Password.create(newPasswordRaw, this.passwordHasher)
        user.changePassword(newPassword)
        await this.userRepository.update(user)
    }
}
