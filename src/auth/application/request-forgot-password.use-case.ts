import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { IUserRepository } from '../../users/domain/user-repository.interface'
import type { IPasswordHasher } from '../domain/password-hasher.interface'
import { randomBytes } from 'crypto'

@Injectable()
export class RequestForgotPasswordUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
        @Inject('IPasswordHasher') private readonly passwordHasher: IPasswordHasher,
    ) { }

    async execute(emailStr: string): Promise<void> {
        const user = await this.userRepository.findByEmail(emailStr)
        if (!user) throw new NotFoundException('User not found')
        const code = randomBytes(4).toString('hex').toUpperCase().slice(0, 7)
        const codeHash = await this.passwordHasher.hash(code)
        const eventPayload = {
            type: 'PASSWORD_RESET_EMAIL_REQUESTED',
            payload: {
                to: user.getEmail()!.getValue(),
                fullName: user.getFullName(),
                code: code
            }
        }
        await this.userRepository.saveForgotPasswordSecret(user.getId().getValue(), codeHash, code, 3, eventPayload)
    }
}
