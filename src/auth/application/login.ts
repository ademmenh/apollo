import { Injectable, Inject } from '@nestjs/common'
import { type IUserRepository } from '../../users/domain/repository'
import { type IPasswordHasher } from '../../auth/domain/password-hasher'
import { type ITokenProvider } from '../domain/token-provider'
import { Email } from 'src/users/domain/email'
import { User } from 'src/users/domain/entity'
import { InvalidCredentialsError } from '../domain/error'

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
    ) { }

    async execute(dto: LoginCommand): Promise<{ user: User; accessToken: string; refreshToken: string }> {
        const email = Email.create(dto.email)
        const user = await this.userRepository.findByEmail(email.getValue())
        if (!user) throw new InvalidCredentialsError()
        const isValid = await user.getPassword().compare(dto.password, this.passwordHasher)
        if (!isValid) throw new InvalidCredentialsError()
        user.canLogin()
        const accessToken = await this.tokenProvider.generateAccessToken(user.getId().getValue(), user.getRole())
        const refreshToken = await this.tokenProvider.generateRefreshToken(user.getId().getValue())
        return {
            user,
            accessToken,
            refreshToken,
        }
    }
}
