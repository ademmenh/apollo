import { IsNotEmpty, IsString, validateSync } from 'class-validator'
import { plainToInstance } from 'class-transformer'

export class VerificationEmailPayloadSchema {
    @IsString()
    @IsNotEmpty()
    fullName: string

    @IsString()
    @IsNotEmpty()
    code: string
}

export class PasswordResetEmailPayloadSchema {
    @IsString()
    @IsNotEmpty()
    fullName: string

    @IsString()
    @IsNotEmpty()
    code: string
}

export function validatePayload<T extends object>(schema: new () => T, payload: any): T {
    const instance = plainToInstance(schema, payload)
    const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true })
    if (errors.length > 0) {
        throw new Error(`Invalid payload: ${errors.map(e => Object.values(e.constraints || {})).join(', ')}`)
    }
    return instance
}
