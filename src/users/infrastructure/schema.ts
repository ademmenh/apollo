import { pgTable, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core'

export const usersTable = pgTable('users', {
    id: uuid('id').primaryKey(),
    email: text('email').unique(),
    password: text('password').notNull(), // Hashed
    role: text('role').notNull(), // 'ADMIN', 'CLIENT', 'DRIVER'
    isBanned: boolean('is_banned').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
})

export const profilesTable = pgTable('profiles', {
    id: uuid('id').primaryKey().references(() => usersTable.id),
    fullName: text('full_name').notNull(),
    birthDate: timestamp('birth_date').notNull(),
    phoneNumber: text('phone_number'),
})
