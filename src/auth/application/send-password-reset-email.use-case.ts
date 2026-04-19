import { Injectable, Inject } from '@nestjs/common'
import type { IEmailPort } from '../domain/email.port'
import { PasswordResetEmailRequestedSchema } from '../infrastructure/events/event.schemas'

@Injectable()
export class SendPasswordResetEmailUseCase {
    constructor(
        @Inject('IEmailAdapter') private readonly emailAdapter: IEmailPort,
    ) { }

    async execute(event: PasswordResetEmailRequestedSchema): Promise<void> {
        await this.emailAdapter.sendPasswordResetEmail(event.to, event.fullName, event.code)
    }
}
