import { Injectable, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { type ITokenProvider } from '../domain/token-provider.interface'
import { type ISessionRepository } from '../domain/session-repository.interface'
import { type IPasswordHasher } from '../../users/domain/password-hasher.interface'
import { type IUserRepository } from '../../users/domain/user-repository.interface'
import { Session } from '../domain/session.entity'
import { TUserRole } from 'src/users/domain/value-objects/user-role.vo'
import { UserNotFoundError } from '../domain/auth.error'

export interface RefreshLoginCommand {
    refreshToken: string
    ip: string
    userAgent: string
    userId: string
    role: TUserRole
}

@Injectable()
export class RefreshLoginUseCase {
    constructor(
        @Inject('ISessionRepository') private readonly sessionRepository: ISessionRepository,
        @Inject('IPasswordHasher') private readonly passwordHasher: IPasswordHasher,
        @Inject('ITokenProvider') private readonly tokenProvider: ITokenProvider,
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    ) { }

    async execute(command: RefreshLoginCommand): Promise<{ accessToken: string; refreshToken: string }> {
        const hashedToken = await this.passwordHasher.hash(command.refreshToken)
        const updatedSession = new Session(
            command.userId,
            hashedToken,
            command.userAgent,
            command.ip,
            command.role,
        )
        await this.sessionRepository.rotate(hashedToken, updatedSession)
        const user = await this.userRepository.findById(command.userId)
        if (!user) throw new UserNotFoundError()
        const accessToken = await this.tokenProvider.generateAccessToken(user.getId().getValue(), user.getRole())
        const refreshToken = await this.tokenProvider.generateRefreshToken(user.getId().getValue())
        return {
            accessToken,
            refreshToken,
        }
    }
}
