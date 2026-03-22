import { Injectable } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { BaseAuthOutboxWorker } from './base-auth-outbox.worker'

@Injectable()
export class AuthEventWorker extends BaseAuthOutboxWorker {
    @Interval(5000)
    async handleEvents(): Promise<void> {
        try {
            const results = await this.outboxRepository.getEventsFromCache(20)
            for (const event of results) {
                const eventStr = typeof event === 'string' ? event : (event as Buffer).toString()
                try {
                    await this.processEvent(JSON.parse(eventStr))
                    await this.outboxRepository.removeEventFromProcessing(eventStr)
                } catch (e) {
                    this.logger.error(`Failed to process cached outbox event: ${e.message}`)
                }
            }
        } catch (e) {
            this.logger.error(`Error in event outbox polling: ${e.message}`)
        }
    }
}
