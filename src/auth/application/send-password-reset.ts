import { Injectable, Inject } from '@nestjs/common'
import type { IEmailPort } from '../domain/email.port'

interface IPasswordResetEmailRequested {
    to: string
    fullName: string
    code: string
}

@Injectable()
export class SendPasswordResetUseCase {
    constructor(
        @Inject('IEmailAdapter') private readonly emailAdapter: IEmailPort,
    ) { }

    async execute(event: IPasswordResetEmailRequested): Promise<void> {
        await this.emailAdapter.sendPasswordResetEmail(event.to, event.fullName, event.code)
    }
}
