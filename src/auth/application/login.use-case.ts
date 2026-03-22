import { Injectable, Inject, UnauthorizedException } from '@nestjs/common'
import { type IUserRepository } from '../../users/domain/user-repository.interface'
import { type IPasswordHasher } from '../../users/domain/password-hasher.interface'
import { type ITokenProvider } from '../domain/token-provider.interface'
import { type ISessionRepository } from '../domain/session-repository.interface'
import { Session } from '../domain/session.entity'
import { Email } from '../../users/domain/value-objects/email.vo'
import { User } from 'src/users/domain/user.aggregate'

export interface LoginCommand {
    email: string
    password: string
}

@Injectable()
export class LoginUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
        @Inject('IPasswordHasher') private readonly passwordHasher: IPasswordHasher,
        @Inject('ITokenProvider') private readonly tokenProvider: ITokenProvider,
        @Inject('ISessionRepository') private readonly sessionRepository: ISessionRepository,
    ) { }

    async execute(dto: LoginCommand, ip: string, userAgent: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
        const email = Email.create(dto.email)
        const user = await this.userRepository.findByEmail(email.getValue())
        if (!user) throw new UnauthorizedException('Invalid credentials')
        const isValid = await user.getPassword().compare(dto.password, this.passwordHasher)
        if (!isValid) throw new UnauthorizedException('Invalid credentials')
        user.canLogin()
        const accessToken = await this.tokenProvider.generateAccessToken(user.getId().getValue(), user.getRole())
        const refreshToken = await this.tokenProvider.generateRefreshToken(user.getId().getValue())
        const hashedRefreshToken = await this.passwordHasher.hash(refreshToken)
        const session = new Session(user.getId().getValue(), hashedRefreshToken, userAgent, ip, user.getRole())
        await this.sessionRepository.save(session)
        return {
            user,
            accessToken,
            refreshToken,
        }
    }
}
