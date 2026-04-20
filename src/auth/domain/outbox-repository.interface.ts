import { OutboxEvent } from './outbox-event'

export interface IOutboxRepository {
    getEventsFromCache(limit: number): Promise<string[]>
    removeEventFromProcessing(event: string): Promise<void>
    recoverStuckCacheEvents(): Promise<number>
    getEventsFromStorage(limit: number): Promise<OutboxEvent[]>
    markEventAsProcessed(id: string): Promise<void>
}
