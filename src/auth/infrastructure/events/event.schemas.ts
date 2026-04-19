import { IsEmail, IsString, IsNotEmpty } from 'class-validator'

export class VerificationEmailRequestedSchema {
    @IsEmail()
    @IsNotEmpty()
    to: string

    @IsString()
    @IsNotEmpty()
    fullName: string

    @IsString()
    @IsNotEmpty()
    code: string
}

export class PasswordResetEmailRequestedSchema {
    @IsEmail()
    @IsNotEmpty()
    to: string

    @IsString()
    @IsNotEmpty()
    fullName: string

    @IsString()
    @IsNotEmpty()
    code: string
}
