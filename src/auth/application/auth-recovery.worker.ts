import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { type IOutboxRepository } from '../domain/outbox-repository.interface'
import { LoggerStore } from '../../config/infrastructure/loggers'
import type { Logger } from 'winston'

@Injectable()
export class AuthRecoveryWorker implements OnModuleInit {
    private logger: Logger

    constructor(
        @Inject('IOutboxRepository') private readonly outboxRepository: IOutboxRepository,
    ) {
        this.logger = LoggerStore.getWorker().getLogger()
    }

    async onModuleInit() {
        await this.recover()
    }

    @Interval(30000)
    async recover(): Promise<void> {
        try {
            const movedCount = await this.outboxRepository.recoverStuckCacheEvents()
            if (movedCount > 0) {
                this.logger.info(`Recovered ${movedCount} stuck outbox events from processing queue.`)
            }
        } catch (e) {
            this.logger.error(`Failed to recover stuck outbox events: ${e.message}`)
        }
    }
}
