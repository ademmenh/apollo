import { Module, Global } from '@nestjs/common'
import { MailerModule } from '@nestjs-modules/mailer'
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MailAdapter } from '../../common/infrastructure/mail.adapter'
import { join } from 'path'

@Global()
@Module({
    imports: [
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                transport: {
                    host: configService.get('EMAIL_HOST'),
                    port: configService.get('EMAIL_PORT'),
                    secure: configService.get('EMAIL_SECURE'),
                    auth: {
                        user: configService.get('EMAIL_USER'),
                        pass: configService.get('EMAIL_PASSWORD'),
                    },
                },
                defaults: {
                    from: `"No Reply" <${configService.get('EMAIL_USER')}>`,
                },
                template: {
                    dir: join(process.cwd(), 'emails'),
                    adapter: new HandlebarsAdapter(),
                    options: {
                        strict: true,
                    },
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [MailAdapter],
    exports: [MailAdapter],
})
export class MailModule { }
