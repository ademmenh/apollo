export interface OutboxEvent {
    id: string;
    aggregateType: string;
    aggregateId: string;
    type: string;
    payload: string;
    status: string;
    createdAt: Date;
    processedAt: Date | null;
}
