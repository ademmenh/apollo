import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { ITokenProvider, TokenPayload } from 'src/auth/domain/token-provider'
import { InvalidTokenError } from 'src/auth/domain/error'
import { type TUserRole } from 'src/users/domain/entity'

@Injectable()
export class TokenAdapter implements ITokenProvider {
    private readonly accessTokenExpiry: number
    private readonly refreshTokenExpiry: number
    private readonly accessTokenSecret: string
    private readonly refreshTokenSecret: string

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {
        this.accessTokenExpiry = this.configService.getOrThrow<number>('JWT_ACCESS_TOKEN_EXPIRY')
        this.refreshTokenExpiry = this.configService.getOrThrow<number>('JWT_REFRESH_TOKEN_EXPIRY')
        this.accessTokenSecret = this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET')
        this.refreshTokenSecret = this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET')
    }

    async generateAccessToken(userId: string, role: TUserRole): Promise<string> {
        const payload: TokenPayload = { sub: userId, role }
        return this.jwtService.signAsync(payload, {
            secret: this.accessTokenSecret,
            expiresIn: this.accessTokenExpiry,
        })
    }

    async generateRefreshToken(userId: string): Promise<string> {
        const payload = { sub: userId }
        return this.jwtService.signAsync(payload, {
            secret: this.refreshTokenSecret,
            expiresIn: this.refreshTokenExpiry,
        })
    }

    async validateAccessToken(token: string): Promise<TokenPayload> {
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: this.accessTokenSecret,
            })
        } catch {
            throw new InvalidTokenError()
        }
    }
}
