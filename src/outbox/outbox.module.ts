import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from '../auth/module'
import { UsersModule } from '../users/module'
import { EmailOutboxWorker } from './infrastructure/workers/email-outbox.worker'
import { OUTBOX_REPOSITORY } from './domain/interfaces/outbox-repository.interface'
import { DrizzleOutboxRepository } from './infrastructure/persistence/drizzle-outbox.repository'

@Global()
@Module({
    imports: [ConfigModule, AuthModule, UsersModule],
    providers: [
        {
            provide: OUTBOX_REPOSITORY,
            useClass: DrizzleOutboxRepository,
        },
        EmailOutboxWorker,
    ],
    exports: [OUTBOX_REPOSITORY],
})
export class OutboxModule { }
