import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'

@Injectable()
export class MailAdapter {
    constructor(private readonly mailerService: MailerService) { }

    async sendEmail(to: string, templateName: string, data: any) {
        return this.mailerService.sendMail({
            to,
            subject: 'Notification',
            template: templateName,
            context: data,
        })
    }
}
