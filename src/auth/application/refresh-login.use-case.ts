import { Injectable, Inject } from '@nestjs/common'
import { type ITokenProvider } from '../domain/token-provider.interface'
import { type IUserRepository } from '../../users/domain/user-repository.interface'
import { TUserRole } from 'src/users/domain/value-objects/user-role.vo'
import { UserNotFoundError } from '../domain/auth.error'

export interface RefreshLoginCommand {
    userId: string
    role: TUserRole
}

@Injectable()
export class RefreshLoginUseCase {
    constructor(
        @Inject('ITokenProvider') private readonly tokenProvider: ITokenProvider,
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    ) { }

    async execute(command: RefreshLoginCommand): Promise<{ accessToken: string; refreshToken: string }> {
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
