export interface IOutboxRepository {
    getEventsFromCache(limit: number): Promise<any[]>
    removeEventFromProcessing(event: string): Promise<void>
    recoverStuckCacheEvents(): Promise<number>
    getEventsFromStorage(limit: number): Promise<any[]>
    markEventAsProcessed(id: string): Promise<void>
}
