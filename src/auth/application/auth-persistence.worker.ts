import { Injectable } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { BaseAuthOutboxWorker } from './base-auth-outbox.worker'

@Injectable()
export class AuthPersistenceWorker extends BaseAuthOutboxWorker {
    @Interval(10000)
    async handlePersistenceEvents(): Promise<void> {
        try {
            const pendingEvents = await this.outboxRepository.getEventsFromStorage(20)

            for (const event of pendingEvents) {
                try {
                    await this.processEvent(event)
                    await this.outboxRepository.markEventAsProcessed(event.id)
                } catch (e) {
                    this.logger.error(`Failed to process persistent outbox event ${event.id} (${event.type}): ${e.message}`)
                }
            }
        } catch (e) {
            this.logger.error(`Error in persistent outbox polling: ${e.message}`)
        }
    }
}
