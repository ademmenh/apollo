import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthResolver } from './presentation/auth.resolver'
import { RegisterUserUseCase } from './application/register-user.use-case'
import { LoginUseCase } from './application/login.use-case'
import { RefreshLoginUseCase } from './application/refresh-login.use-case'
import { VerifyUserUseCase } from './application/verify-user.use-case'
import { ForgotPasswordResetUseCase } from './application/forgot-password-reset.use-case'
import { ChangePasswordUseCase } from './application/change-password.use-case'
import { RequestForgotPasswordUseCase } from './application/request-forgot-password.use-case'
import { TokenAdapter } from './infrastructure/adapters/token.adapter'
import { AuthEmailAdapter } from './infrastructure/adapters/auth-email.adapter'
import { JwtAccessStrategy } from './presentation/strategies/jwt-access.strategy'
import { JwtRefreshStrategy } from './presentation/strategies/jwt-refresh.strategy'
import { UsersModule } from '../users/users.module'
import { OutboxRepository } from './infrastructure/persistence/outbox.repository'
import { JwtAccessGuard } from './presentation/guards/jwt-access.guard'
import { MailModule } from '../config/infrastructure/mail.module'
import { EmailOutboxWorker } from './infrastructure/workers/email-outbox.worker'
import { SendVerificationEmailUseCase } from './application/send-verification-email.use-case'
import { SendPasswordResetEmailUseCase } from './application/send-password-reset-email.use-case'

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
    providers: [
        AuthResolver,
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
        SendVerificationEmailUseCase,
        SendPasswordResetEmailUseCase,
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
