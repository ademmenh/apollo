import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './presentation/auth.controller'
import { RegisterUserUseCase } from './application/register'
import { LoginUseCase } from './application/login'
import { RefreshLoginUseCase } from './application/refresh-login'
import { VerifyUserUseCase } from './application/verify-user'
import { ForgotPasswordResetUseCase } from './application/forgot-password-reset'
import { ChangePasswordUseCase } from './application/change-password'
import { RequestForgotPasswordUseCase } from './application/request-forgot-password'
import { TokenAdapter } from './infrastructure/token'
import { AuthEmailAdapter } from './infrastructure/email'
import { UsersModule } from '../users/module'
import { OutboxRepository } from './infrastructure/outbox-repository'
import { JwtAccessGuard, JwtAccessStrategy } from './presentation/access-token'
import { JwtRefreshGuard, JwtRefreshStrategy } from './presentation/refresh-token'
import { MailModule } from '../config/infrastructure/mail-module'
import { EmailOutboxWorker } from './infrastructure/worker'
import { SendVerificationEmailUseCase } from './application/send-verification-email'
import { SendPasswordResetUseCase } from './application/send-password-reset'

@Module({
    imports: [
        ConfigModule,
        UsersModule,
        PassportModule,
        MailModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
                signOptions: {
                    expiresIn: configService.get<number>('JWT_ACCESS_TOKEN_EXPIRY'),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [
        {
            provide: 'ITokenProvider',
            useClass: TokenAdapter,
        },
        RegisterUserUseCase,
        LoginUseCase,
        RefreshLoginUseCase,
        VerifyUserUseCase,
        ForgotPasswordResetUseCase,
        RequestForgotPasswordUseCase,
        ChangePasswordUseCase,
        JwtAccessStrategy,
        JwtRefreshStrategy,
        JwtAccessGuard,
        JwtRefreshGuard,
        SendVerificationEmailUseCase,
        SendPasswordResetUseCase,
        EmailOutboxWorker,
        {
            provide: 'IEmailAdapter',
            useClass: AuthEmailAdapter,
        },
        {
            provide: 'IOutboxRepository',
            useClass: OutboxRepository,
        },
    ],
    exports: ['ITokenProvider', JwtAccessGuard],
})
export class AuthModule { }
