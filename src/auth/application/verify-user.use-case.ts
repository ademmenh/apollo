import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import type { IUserRepository } from '../../users/domain/user-repository.interface'
import type { IPasswordHasher } from '../domain/password-hasher.interface'
import { type ITokenProvider } from '../domain/token-provider.interface'
import { User } from '../../users/domain/user.aggregate'
import { Session } from '../domain/session.entity'

@Injectable()
export class VerifyUserUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
        @Inject('IPasswordHasher') private readonly passwordHasher: IPasswordHasher,
        @Inject('ITokenProvider') private readonly tokenProvider: ITokenProvider,
    ) { }

    async execute(userId: string, code: string, ip: string, userAgent: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
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
        const accessToken = await this.tokenProvider.generateAccessToken(user.getId().getValue(), user.getRole())
        const refreshToken = await this.tokenProvider.generateRefreshToken(user.getId().getValue())
        const hashedRefreshToken = await this.passwordHasher.hash(refreshToken)
        const sessionPayload: Session = {
            userId: user.getId().getValue(),
            hashedRefreshToken,
            userAgent,
            ipAddress: ip,
            role: user.getRole(),
        }
        await this.userRepository.save(user, { type: 'USER_VERIFIED', payload: sessionPayload })
        return {
            user,
            accessToken,
            refreshToken,
        }
    }
}
