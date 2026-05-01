import { Inject, Injectable } from '@nestjs/common'
import type { IUserRepository } from '../../users/domain/repository'
import type { IPasswordHasher } from '../domain/password-hasher'
import {
    UserAlreadyVerifiedError,
    CodeExpiredOrUserNotFoundError,
    TooManyAttemptsError,
    InvalidCodeError
} from '../domain/error'

@Injectable()
export class VerifyUserUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
        @Inject('IPasswordHasher') private readonly passwordHasher: IPasswordHasher,
    ) { }

    async execute(userId: string, code: string): Promise<null> {
        const userVerified = await this.userRepository.findById(userId)
        if (userVerified) throw new UserAlreadyVerifiedError()
        const userNotVerified = await this.userRepository.getNotVerified(userId)
        if (!userNotVerified) throw new CodeExpiredOrUserNotFoundError()
        if (userNotVerified.attempts <= 0) throw new TooManyAttemptsError()
        const isCodeValid = await this.passwordHasher.compare(code, userNotVerified.codeHash)
        if (!isCodeValid) {
            await this.userRepository.setNotVerified(userNotVerified.user, userNotVerified.codeHash, userNotVerified.attempts - 1)
            throw new InvalidCodeError(userNotVerified.attempts - 1)
        }
        const user = userNotVerified.user
        user.canLogin()
        await this.userRepository.save(user)
        return null
    }
}
