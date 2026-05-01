import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

export class RegisterUserDto {
    @IsOptional()
    @IsEmail()
    @ApiProperty({ example: 'test@gmail.com', required: false })
    email?: string

    @IsString()
    @ApiProperty({ example: 'John Doe' })
    @IsNotEmpty()
    fullName: string

    @IsString()
    @ApiProperty({ example: '1990-01-01' })
    @IsNotEmpty()
    birthDate: string // ISO date string

    @IsString()
    @ApiProperty({ example: 'password' })
    @IsNotEmpty()
    password: string

    @IsOptional()
    @ApiProperty({ example: '0512345678', required: false })
    @IsString()
    phoneNumber?: string
}

export class LoginDto {
    @IsEmail()
    @ApiProperty({ example: 'test@gmail.com' })
    email: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'password' })
    password: string
}

export class VerifyUserDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'ABC1234' })
    code: string
}

export class RequestForgotPasswordDto {
    @IsEmail()
    @ApiProperty({ example: 'test@gmail.com' })
    email: string
}

export class ForgotPasswordResetDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'user-uuid' })
    id: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'SECRET123' })
    secret: string

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @ApiProperty({ example: 'newPassword123' })
    newPassword: string
}

export class ResetPasswordDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'OldPassword123!' })
    oldPassword: string

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @ApiProperty({ example: 'NewPassword123!' })
    newPassword: string
}
