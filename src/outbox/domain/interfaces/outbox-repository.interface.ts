export interface IOutboxEvent {
    id: string
    type: string
    payload: unknown
    receiverId: string
    status: 'unprocessed' | 'processed' | 'delivered'
}

export const OUTBOX_REPOSITORY = 'IOutboxRepository'

export interface IOutboxRepository {
    getUnprocessedEvents(limit: number): Promise<IOutboxEvent[]>
    markEventAsProcessed(id: string): Promise<void>
}
