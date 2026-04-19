import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'
import { TokenPayload } from '../../domain/token-provider.interface'

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([(req: Request) => req.headers.authorization?.split(' ')[1]]),
            ignoreExpiration: true,
            secretOrKey: configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
            passReqToCallback: true,
        })
    }

    async validate(req: Request, payload: TokenPayload): Promise<TokenPayload> {
        return payload
    }
}
