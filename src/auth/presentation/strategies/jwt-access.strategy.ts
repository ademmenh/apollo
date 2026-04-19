import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'
import { TokenPayload } from '../../domain/token-provider.interface'

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([(req: Request) => req.headers.authorization?.split(' ')[1]]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
            algorithms: [configService.get<string>('JWT_ALGO')],
        })
    }

    async validate(payload: TokenPayload): Promise<TokenPayload> {
        return payload
    }
}
