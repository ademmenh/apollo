import { pgTable, uuid, text, timestamp, jsonb, index, pgEnum } from 'drizzle-orm/pg-core'

export const eventStatusEnum = pgEnum('event_status', ['unprocessed', 'processed', 'delivered'])

export const eventsForOne = pgTable('events_for_one', {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    receiverId: uuid('receiver_id').notNull(),
    status: eventStatusEnum('status').default('unprocessed').notNull(),
}, (t) => [
    index('events_receiver_status_idx').on(t.receiverId, t.status)
])
