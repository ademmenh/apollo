import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { GqlExecutionContext } from '@nestjs/graphql'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'
import { TokenPayload } from '../domain/token-provider'

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

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
    getRequest(context: ExecutionContext) {
        const ctx = GqlExecutionContext.create(context)
        return ctx.getContext().req
    }
}
