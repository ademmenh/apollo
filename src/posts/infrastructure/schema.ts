import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { usersTable } from '../../users/infrastructure/schema'

export const postsTable = pgTable('posts', {
    id: uuid('id').primaryKey(),
    authorId: uuid('author_id').references(() => usersTable.id).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})
