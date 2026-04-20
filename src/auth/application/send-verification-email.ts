import { Injectable, Inject } from '@nestjs/common'
import type { IEmailPort } from '../domain/email.port'
import { VerificationEmailRequestedSchema } from '../infrastructure/events'

@Injectable()
export class SendVerificationEmailUseCase {
    constructor(
        @Inject('IEmailAdapter') private readonly emailAdapter: IEmailPort,
    ) { }

    async execute(event: VerificationEmailRequestedSchema): Promise<void> {
        await this.emailAdapter.sendVerificationEmail(event.to, event.fullName, event.code)
    }
}
