import { Body, Controller, Post, HttpStatus, UseGuards, Param, HttpCode } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { ApiTags, ApiOperation, ApiExtraModels, getSchemaPath } from '@nestjs/swagger'
import { RegisterUserDto, LoginDto, VerifyUserDto, ForgotPasswordResetDto, RequestForgotPasswordDto, ResetPasswordDto } from './dtos/input.dto'
import { IResponse, IAuthResponse, TokensRDTO, UserProfileRDTO } from './dtos/response.dto'
import { RegisterUserUseCase } from '../application/register'
import { LoginUseCase } from '../application/login'
import { RefreshLoginUseCase } from '../application/refresh-login'
import { VerifyUserUseCase } from '../application/verify-user'
import { ForgotPasswordResetUseCase } from '../application/forgot-password-reset'
import { RequestForgotPasswordUseCase } from '../application/request-forgot-password'
import { ChangePasswordUseCase } from '../application/change-password'
import { JwtRefreshGuard } from './refresh-token'
import { JwtAccessGuard } from './access-token'
import { UserD } from './user-decorator'
import type { TokenPayload } from '../domain/token-provider'
import { UserMapper } from '../../users/infrastructure/mapper'
import { ApiDocs } from '../../common/presentation/api-docs.decorator'
import { getResponseSchema } from '../../common/presentation/response-schema.helper'
import { AuthExceptionFilter } from './exception-filter'
import { UseFilters } from '@nestjs/common'

@ApiTags('Auth')
@Controller('auth')
@ApiExtraModels(UserProfileRDTO, TokensRDTO)
@UseFilters(AuthExceptionFilter)
export class AuthController {
    constructor(
        private readonly registerUserUseCase: RegisterUserUseCase,
        private readonly loginUseCase: LoginUseCase,
        private readonly refreshLoginUseCase: RefreshLoginUseCase,
        private readonly verifyUserUseCase: VerifyUserUseCase,
        private readonly forgotPasswordResetUseCase: ForgotPasswordResetUseCase,
        private readonly requestForgotPasswordUseCase: RequestForgotPasswordUseCase,
        private readonly changePasswordUseCase: ChangePasswordUseCase,
    ) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiDocs([
        {
            status: HttpStatus.CREATED,
            description: 'User registered successfully',
            schema: getResponseSchema(UserProfileRDTO, 'User registered successfully', HttpStatus.CREATED),
        },
    ])
    async register(@Body() dto: RegisterUserDto): Promise<IResponse<UserProfileRDTO>> {
        const user = await this.registerUserUseCase.execute({ ...dto, id: randomUUID() })
        return {
            message: 'User registered successfully',
            statusCode: HttpStatus.CREATED,
            data: UserMapper.toResponse(user),
        }
    }

    @Post(':id/verify')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify user registration' })
    @ApiDocs([
        {
            status: HttpStatus.OK,
            description: 'User verified successfully',
            schema: getResponseSchema(null, 'User verified successfully'),
        },
    ])
    async verify(@Param('id') id: string, @Body() dto: VerifyUserDto): Promise<IResponse<null>> {
        await this.verifyUserUseCase.execute(id, dto.code)
        return {
            message: 'User verified successfully',
            statusCode: HttpStatus.OK,
            data: null,
        }
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login' })
    @ApiDocs([
        {
            status: HttpStatus.OK,
            description: 'Login successful',
            schema: {
                type: 'object',
                properties: {
                    statusCode: { type: 'number', example: 200 },
                    message: { type: 'string', example: 'Login successful' },
                    data: { $ref: getSchemaPath(UserProfileRDTO) },
                    tokens: { $ref: getSchemaPath(TokensRDTO) },
                },
            },
        },
    ])
    async login(@Body() dto: LoginDto): Promise<IAuthResponse<UserProfileRDTO>> {
        const { user, accessToken, refreshToken } = await this.loginUseCase.execute(dto)
        return {
            message: 'Login successful',
            statusCode: HttpStatus.OK,
            data: UserMapper.toResponse(user),
            tokens: {
                accessToken,
                refreshToken,
            },
        }
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtRefreshGuard)
    @ApiOperation({ summary: 'Refresh tokens' })
    @ApiDocs([
        {
            status: HttpStatus.OK,
            description: 'Tokens refreshed successfully',
            schema: getResponseSchema(TokensRDTO, 'Tokens refreshed successfully'),
        },
    ], 'refresh-token')
    async refresh(@UserD() token: TokenPayload): Promise<IResponse<TokensRDTO>> {
        const tokens = await this.refreshLoginUseCase.execute({ userId: token.sub, role: token.role })
        return {
            message: 'Tokens refreshed successfully',
            statusCode: HttpStatus.OK,
            data: tokens,
        }
    }

    @Post('request-forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset code' })
    @ApiDocs([
        {
            status: HttpStatus.OK,
            description: 'Reset code sent successfully',
            schema: getResponseSchema(null, 'Reset code sent to your email'),
        },
    ])
    async requestForgotPassword(@Body() dto: RequestForgotPasswordDto): Promise<IResponse<null>> {
        await this.requestForgotPasswordUseCase.execute(dto.email)
        return {
            message: 'Reset code sent to your email',
            statusCode: HttpStatus.OK,
            data: null,
        }
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password using secret' })
    @ApiDocs([
        {
            status: HttpStatus.OK,
            description: 'Password reset successfully',
            schema: getResponseSchema(null, 'Password reset successfully'),
        },
    ])
    async forgotPasswordReset(@Body() dto: ForgotPasswordResetDto): Promise<IResponse<null>> {
        await this.forgotPasswordResetUseCase.execute(dto.id, dto.secret, dto.newPassword)
        return {
            message: 'Password reset successfully',
            statusCode: HttpStatus.OK,
            data: null,
        }
    }

    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAccessGuard)
    @ApiOperation({ summary: 'Change password for logged in user' })
    @ApiDocs([
        {
            status: HttpStatus.OK,
            description: 'Password changed successfully',
            schema: getResponseSchema(null, 'Password changed successfully'),
        },
    ])

    async changePassword(@UserD() token: TokenPayload, @Body() dto: ResetPasswordDto): Promise<IResponse<null>> {
        await this.changePasswordUseCase.execute(token.sub, dto.oldPassword, dto.newPassword)
        return {
            message: 'Password changed successfully',
            statusCode: HttpStatus.OK,
            data: null,
        }
    }
}
