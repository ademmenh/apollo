import { Resolver, Mutation, Args, Query } from '@nestjs/graphql'
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
    UserRDTO,
    LoginRDTO,
    RefreshRDTO,
    SuccessResponse,
    RegisterUserDTO,
    LoginDTO,
    VerifyUserDTO,
    ForgotPasswordResetDTO,
    ResetPasswordDTO,
} from './auth.types'
import { UserD } from './user.decorators'
import type { TokenPayload } from '../domain/token-provider.interface'
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

    @Mutation(() => UserRDTO)
    async register(
        @Args('input', { type: () => RegisterUserDTO }) input: RegisterUserDTO,
    ): Promise<UserRDTO> {
        const user = await this.registerUserUseCase.execute({
            id: randomUUID(),
            ...input,
        })
        return AuthMapper.toResponse(user)
    }

    @Mutation(() => SuccessResponse)
    async verify(
        @Args('input', { type: () => VerifyUserDTO }) input: VerifyUserDTO,
    ): Promise<SuccessResponse> {
        await this.verifyUserUseCase.execute(input.id, input.code)
        return { message: 'User verified successfully' }
    }

    @Mutation(() => LoginRDTO)
    async login(
        @Args('input', { type: () => LoginDTO }) input: LoginDTO,
    ): Promise<LoginRDTO> {
        const { user, ...tokens } = await this.loginUseCase.execute(input)
        return { user: AuthMapper.toResponse(user), ...tokens }
    }

    @Mutation(() => RefreshRDTO)
    @UseGuards(JwtRefreshGuard)
    async refresh(
        @UserD() token: TokenPayload,
    ): Promise<RefreshRDTO> {
        return this.refreshLoginUseCase.execute({
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
        @Args('input', { type: () => ForgotPasswordResetDTO }) input: ForgotPasswordResetDTO,
    ): Promise<SuccessResponse> {
        await this.forgotPasswordResetUseCase.execute(input.id, input.secret, input.newPassword)
        return { message: 'Password reset successfully' }
    }

    @Mutation(() => SuccessResponse)
    @UseGuards(JwtAccessGuard)
    async changePassword(
        @Args('input', { type: () => ResetPasswordDTO }) input: ResetPasswordDTO,
    ): Promise<SuccessResponse> {
        await this.changePasswordUseCase.execute(input.id, input.oldPassword, input.newPassword)
        return { message: 'Password changed successfully' }
    }
}
