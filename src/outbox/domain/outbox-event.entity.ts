export class OutboxEvent {
    constructor(
        public readonly id: string,
        public readonly type: string,
        public readonly payload: Record<string, unknown>,
        public readonly receiverId: string,
        public readonly status: 'unprocessed' | 'processed' | 'delivered' = 'unprocessed',
        public readonly createdAt: Date = new Date(),
    ) { }

    static create(
        id: string,
        type: string,
        payload: Record<string, unknown>,
        receiverId: string,
    ): OutboxEvent {
        return new OutboxEvent(id, type, payload, receiverId)
    }
}
