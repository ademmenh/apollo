import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import type { IUserRepository } from '../../users/domain/repository'
import type { IPasswordHasher } from '../domain/password-hasher'
import type { ITokenProvider } from '../domain/token-provider';

@Injectable()
export class VerifyUserUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
        @Inject('IPasswordHasher') private readonly passwordHasher: IPasswordHasher,
        @Inject('ITokenProvider') private readonly tokenProvider: ITokenProvider
    ) { }

    async execute(userId: string, code: string): Promise<null> {
        const userVerified = await this.userRepository.findById(userId)
        if (userVerified) throw new BadRequestException('User already verified')
        const userNotVerified = await this.userRepository.getNotVerifiedUser(userId)
        if (!userNotVerified) throw new NotFoundException('User not found or code expired')
        if (userNotVerified.attempts <= 0) throw new NotFoundException('Too many attempts.')
        const isCodeValid = await this.passwordHasher.compare(code, userNotVerified.codeHash)
        if (!isCodeValid) {
            await this.userRepository.saveNotVerified(userNotVerified.user, userNotVerified.codeHash, userNotVerified.attempts - 1, { type: 'CODE_VERIFICATION', payload: { code } })
            throw new BadRequestException(`Invalid code. Attempts left: ${userNotVerified.attempts - 1}`)
        }
        const user = userNotVerified.user
        user.canLogin()
        await this.userRepository.save(user)
        return null
    }
}
