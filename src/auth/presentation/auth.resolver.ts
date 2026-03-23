import { Resolver, Mutation, Args, Context, Query } from '@nestjs/graphql'
import { UseFilters, UseGuards } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { RegisterUserUseCase } from '../application/register-user.use-case'
import { LoginUseCase } from '../application/login.use-case'
import { RefreshLoginUseCase } from '../application/refresh-login.use-case'
import { VerifyUserUseCase } from '../application/verify-user.use-case'
import { ForgotPasswordResetUseCase } from '../application/forgot-password-reset.use-case'
import { ChangePasswordUseCase } from '../application/change-password.use-case'
import { RequestForgotPasswordUseCase } from '../application/request-forgot-password.use-case'
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'
import { JwtAccessGuard } from './guards/jwt-access.guard'
import { AuthExceptionFilter } from './auth-exception.filter'
import {
    User,
    LoginResponse,
    RefreshResponse,
    SuccessResponse,
    RegisterUserInput,
    LoginInput,
    VerifyUserInput,
    ForgotPasswordResetInput,
    ResetPasswordInput,
} from './auth.types'
import { UserD, RequestDataD } from './user.decorators'
import type { RequestData } from './user.decorators'
import type { UserPayload } from '../domain/token-provider.interface'
import { AuthMapper } from './auth.mapper'

@Resolver()
@UseFilters(AuthExceptionFilter)
export class AuthResolver {
    constructor(
        private readonly registerUserUseCase: RegisterUserUseCase,
        private readonly loginUseCase: LoginUseCase,
        private readonly refreshLoginUseCase: RefreshLoginUseCase,
        private readonly verifyUserUseCase: VerifyUserUseCase,
        private readonly forgotPasswordResetUseCase: ForgotPasswordResetUseCase,
        private readonly changePasswordUseCase: ChangePasswordUseCase,
        private readonly requestForgotPasswordUseCase: RequestForgotPasswordUseCase,
    ) { }

    @Query(() => String)
    healthCheck(): string {
        return 'Auth service is running'
    }

    @Mutation(() => User)
    async register(
        @Args('input', { type: () => RegisterUserInput }) input: RegisterUserInput,
    ): Promise<User> {
        const user = await this.registerUserUseCase.execute({
            id: randomUUID(),
            ...input,
        })
        return AuthMapper.toResponse(user)
    }

    @Mutation(() => LoginResponse)
    async verify(
        @Args('input', { type: () => VerifyUserInput }) input: VerifyUserInput,
        @RequestDataD() reqData: RequestData,
    ): Promise<LoginResponse> {
        const { user, ...tokens } = await this.verifyUserUseCase.execute(
            input.id, input.code, reqData.ip, reqData.userAgent,
        )
        return { user: AuthMapper.toResponse(user), ...tokens }
    }

    @Mutation(() => LoginResponse)
    async login(
        @Args('input', { type: () => LoginInput }) input: LoginInput,
        @RequestDataD() reqData: RequestData,
    ): Promise<LoginResponse> {
        const { user, ...tokens } = await this.loginUseCase.execute(
            input, reqData.ip, reqData.userAgent,
        )
        return { user: AuthMapper.toResponse(user), ...tokens }
    }

    @Mutation(() => RefreshResponse)
    @UseGuards(JwtRefreshGuard)
    async refresh(
        @UserD() token: UserPayload,
        @Context() context: any,
        @RequestDataD() reqData: RequestData,
    ): Promise<RefreshResponse> {
        const authHeader = context.req.headers['authorization']
        const refreshToken = authHeader ? authHeader.split(' ')[1] : ''
        return this.refreshLoginUseCase.execute({
            refreshToken,
            ip: reqData.ip,
            userAgent: reqData.userAgent,
            userId: token.sub,
            role: token.role,
        })
    }

    @Mutation(() => SuccessResponse)
    async requestForgotPassword(
        @Args('email', { type: () => String }) email: string,
    ): Promise<SuccessResponse> {
        await this.requestForgotPasswordUseCase.execute(email)
        return { message: 'Reset code sent to your email' }
    }

    @Mutation(() => SuccessResponse)
    async resetForgotPassword(
        @Args('input', { type: () => ForgotPasswordResetInput }) input: ForgotPasswordResetInput,
    ): Promise<SuccessResponse> {
        await this.forgotPasswordResetUseCase.execute(input.id, input.secret, input.newPassword)
        return { message: 'Password reset successfully' }
    }

    @Mutation(() => SuccessResponse)
    @UseGuards(JwtAccessGuard)
    async changePassword(
        @Args('input', { type: () => ResetPasswordInput }) input: ResetPasswordInput,
    ): Promise<SuccessResponse> {
        await this.changePasswordUseCase.execute(input.id, input.oldPassword, input.newPassword)
        return { message: 'Password changed successfully' }
    }
}
