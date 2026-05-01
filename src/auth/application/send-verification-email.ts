import { Injectable, Inject } from '@nestjs/common'
import type { IEmailPort } from '../domain/email.port'

interface IVerificationEmailRequested {
    to: string
    fullName: string
    code: string
}

@Injectable()
export class SendVerificationEmailUseCase {
    constructor(
        @Inject('IEmailAdapter') private readonly emailAdapter: IEmailPort,
    ) { }

    async execute(event: IVerificationEmailRequested): Promise<void> {
        await this.emailAdapter.sendVerificationEmail(event.to, event.fullName, event.code)
    }
}
