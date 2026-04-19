import { Inject, Injectable } from '@nestjs/common'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { Batch, GlideClient } from '@valkey/valkey-glide'
import { IOutboxRepository } from '../../domain/outbox-repository.interface'
import { outboxEventsTable } from '../../../users/infrastructure/persistence/schema'
import { OutboxEvent } from '../../domain/outbox-event.entity'

@Injectable()
export class OutboxRepository implements IOutboxRepository {
    constructor(
        @Inject('DRIZZLE_CLIENT') private readonly db: NodePgDatabase,
        @Inject('VALKEY_CLIENT') private readonly valkey: GlideClient,
    ) { }

    async getEventsFromCache(limit: number): Promise<string[]> {
        const batch = new Batch(false)
        for (let i = 0; i < limit; i++) {
            batch.customCommand(['RPOPLPUSH', 'outbox:events', 'outbox:processing'])
        }
        const results = await this.valkey.exec(batch, true)
        if (!results) return []
        
        return results.filter((item): item is string => typeof item === 'string')
    }

    async removeEventFromProcessing(event: string): Promise<void> {
        await this.valkey.customCommand(['LREM', 'outbox:processing', '1', event])
    }

    async recoverStuckCacheEvents(): Promise<number> {
        let movedCount = 0
        while (true) {
            const moved = await this.valkey.customCommand(['RPOPLPUSH', 'outbox:processing', 'outbox:events'])
            if (!moved) break
            movedCount++
        }
        return movedCount
    }

    async getEventsFromStorage(limit: number): Promise<OutboxEvent[]> {
        const results = await this.db.select()
            .from(outboxEventsTable)
            .where(eq(outboxEventsTable.status, 'PENDING'))
            .for('update', { skipLocked: true })
            .limit(limit)
        
        return results
    }

    async markEventAsProcessed(id: string): Promise<void> {
        await this.db.update(outboxEventsTable)
            .set({ status: 'PROCESSED', processedAt: new Date() })
            .where(eq(outboxEventsTable.id, id))
    }
}
