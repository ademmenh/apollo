import { Inject, Injectable } from '@nestjs/common'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { eventsForOne } from './schema'
import { IOutboxRepository, IOutboxEvent } from '../../domain/interfaces/outbox-repository.interface'

@Injectable()
export class DrizzleOutboxRepository implements IOutboxRepository {
    constructor(@Inject('DRIZZLE_CLIENT') private readonly db: NodePgDatabase) { }

    async getUnprocessedEvents(limit: number): Promise<IOutboxEvent[]> {
        const rows = await this.db.select()
            .from(eventsForOne)
            .where(eq(eventsForOne.status, 'unprocessed'))
            .limit(limit)
            .for('update', { skipLocked: true })

        return rows.map(r => ({
            id: r.id,
            type: r.type,
            payload: r.payload,
            receiverId: r.receiverId,
            status: r.status as 'unprocessed' | 'processed' | 'delivered',
        }))
    }

    async markEventAsProcessed(id: string): Promise<void> {
        await this.db.update(eventsForOne)
            .set({ status: 'processed' })
            .where(eq(eventsForOne.id, id))
    }
}
