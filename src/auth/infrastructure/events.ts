import { plainToInstance } from 'class-transformer'
import { validateSync, IsEmail, IsString, IsNotEmpty } from 'class-validator'

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

export function VerificationEmailRequestedValidation(json: string): VerificationEmailRequestedSchema {
    const raw = JSON.parse(json)
    const instance = plainToInstance(VerificationEmailRequestedSchema, raw)
    const errors = validateSync(instance)
    if (errors.length > 0) {
        throw new Error(`Validation failed for VerificationEmailRequested: ${JSON.stringify(errors)}`)
    }
    return instance
}

export function PasswordResetEmailRequestedValidation(json: string): PasswordResetEmailRequestedSchema {
    const raw = JSON.parse(json)
    const instance = plainToInstance(PasswordResetEmailRequestedSchema, raw)
    const errors = validateSync(instance)
    if (errors.length > 0) {
        throw new Error(`Validation failed for PasswordResetEmailRequested: ${JSON.stringify(errors)}`)
    }
    return instance
}
