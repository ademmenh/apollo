import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { VerificationEmailRequestedSchema, PasswordResetEmailRequestedSchema } from './event.schemas'

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
