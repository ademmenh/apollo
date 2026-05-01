import { Injectable, Inject, OnModuleInit } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { type IOutboxRepository } from '../domain/outbox-repository.interface'
import { Logger } from '../../common/infrastructure/logger'
import { SendVerificationEmailUseCase } from '../application/send-verification-email'
import { SendPasswordResetUseCase } from '../application/send-password-reset'
import {
    VerificationEmailRequestedValidation,
    PasswordResetEmailRequestedValidation
} from './events'

@Injectable()
export class EmailOutboxWorker implements OnModuleInit {
    constructor(
        @Inject('IOutboxRepository') private readonly outboxRepository: IOutboxRepository,
        @Inject('WORKER_LOGGER') private readonly logger: Logger,
        private readonly sendVerificationEmailUseCase: SendVerificationEmailUseCase,
        private readonly sendPasswordResetUseCase: SendPasswordResetUseCase,
    ) { }

    async onModuleInit() {
        await this.recover()
    }

    @Interval(5000)
    async handleValkeyEvents(): Promise<void> {
        try {
            const events = await this.outboxRepository.getEventsFromCache(20)

            for (const eventStr of events) {
                try {
                    const parsedOuter = JSON.parse(eventStr)

                    if (parsedOuter.type === 'VERIFICATION_EMAIL_REQUESTED') {
                        const payloadStr = typeof parsedOuter.payload === 'string'
                            ? parsedOuter.payload
                            : JSON.stringify(parsedOuter.payload)

                        const validated = VerificationEmailRequestedValidation(payloadStr)
                        await this.sendVerificationEmailUseCase.execute(validated)
                        await this.outboxRepository.removeEventFromProcessing(eventStr)
                    }
                } catch (e) {
                    this.logger.error(`Failed to process cached outbox event: ${e.message}`)
                }
            }
        } catch (e) {
            this.logger.error(`Error in cache outbox polling: ${e.message}`)
        }
    }

    @Interval(10000)
    async handlePostgresEvents(): Promise<void> {
        try {
            const pendingEvents = await this.outboxRepository.getEventsFromStorage(20)

            for (const event of pendingEvents) {
                try {
                    if (event.type === 'PASSWORD_RESET_EMAIL_REQUESTED') {
                        const validated = PasswordResetEmailRequestedValidation(event.payload)
                        await this.sendPasswordResetUseCase.execute(validated)
                        await this.outboxRepository.markEventAsProcessed(event.id)
                    }
                } catch (e) {
                    this.logger.error(`Failed to process persistent outbox event ${event.id}: ${e.message}`)
                }
            }
        } catch (e) {
            this.logger.error(`Error in persistent outbox polling: ${e.message}`)
        }
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
