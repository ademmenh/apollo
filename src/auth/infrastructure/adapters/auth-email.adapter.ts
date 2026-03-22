import { Injectable } from '@nestjs/common'
import type { IEmailPort } from 'src/auth/domain/email.port'
import { MailAdapter } from 'src/common/infrastructure/mail.adapter'

@Injectable()
export class AuthEmailAdapter implements IEmailPort {
    constructor(private readonly mailService: MailAdapter) { }

    async sendVerificationEmail(to: string, name: string, code: string): Promise<void> {
        await this.mailService.sendEmail(to, 'verify', { name, code })
    }

    async sendPasswordResetEmail(to: string, name: string, code: string): Promise<void> {
        await this.mailService.sendEmail(to, 'reset-password', { name, code })
    }
}
