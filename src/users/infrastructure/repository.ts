import { Inject, Injectable } from '@nestjs/common'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, inArray } from 'drizzle-orm'
import { Batch, GlideClient, GlideJson, GlideString } from '@valkey/valkey-glide'
import { IUserRepository } from '../domain/repository'
import { User } from '../domain/entity'
import { UserProfile } from '../domain/user-profile'
import { UserMapper } from './mapper'
import { usersTable, outboxEventsTable, profilesTable } from './schema'
import { randomUUID } from 'crypto'

@Injectable()
export class UserRepository implements IUserRepository {
    private readonly ttl: number

    constructor(
        @Inject('DRIZZLE_CLIENT') private readonly db: NodePgDatabase,
        @Inject('VALKEY_CLIENT') private readonly valkey: GlideClient,
    ) {
        this.ttl = 60 * 15
    }

    async save(user: User): Promise<User> {
        const persistenceModel = UserMapper.toPersistence(user)
        await this.db.transaction(async (tx) => {
            await tx.insert(usersTable).values(persistenceModel.usersTable).onConflictDoUpdate({
                target: usersTable.id,
                set: persistenceModel.usersTable,
            })
            await tx.insert(profilesTable).values(persistenceModel.profilesTable).onConflictDoUpdate({
                target: profilesTable.id,
                set: persistenceModel.profilesTable,
            })
        })
        return user
    }

    async update(user: User): Promise<User> {
        const persistenceModel = UserMapper.toPersistence(user)
        await this.db.transaction(async (tx) => {
            await tx.update(usersTable).set(persistenceModel.usersTable).where(eq(usersTable.id, user.getId().getValue()))
            await tx.update(profilesTable).set(persistenceModel.profilesTable).where(eq(profilesTable.id, user.getId().getValue()))
        })
        return user
    }

    async findById(id: string): Promise<User | null> {
        const result = await this.db.select()
            .from(usersTable)
            .innerJoin(profilesTable, eq(usersTable.id, profilesTable.id))
            .where(eq(usersTable.id, id))
            .limit(1)
        if (result.length === 0) return null
        return UserMapper.toDomain(result[0].users, result[0].profiles)
    }

    async findByEmail(email: string): Promise<User | null> {
        const result = await this.db.select()
            .from(usersTable)
            .innerJoin(profilesTable, eq(usersTable.id, profilesTable.id))
            .where(eq(usersTable.email, email))
            .limit(1)
        if (result.length === 0) return null
        return UserMapper.toDomain(result[0].users, result[0].profiles)
    }

    async saveNotVerified(user: User, codeHash: string, attempts: number, eventPayload: { type: string; payload: any }): Promise<void> {
        const key = `user:not-verified:${user.getId().getValue()}`
        const phoneNumber = user.getPhoneNumber()
        const email = user.getEmail()
        const data = {
            user: UserMapper.toPersistence(user),
            codeHash,
            attempts,
        }

        const batch = new Batch(true)
        batch.customCommand(['JSON.SET', key, '$', JSON.stringify(data)])
        if (phoneNumber) {
            const phoneKey = `phone:not-verified:${phoneNumber.getValue()}`
            batch.del([phoneKey])
            batch.set(phoneKey, user.getId().getValue())
            batch.expire(phoneKey, this.ttl)
        }
        if (email) {
            const emailKey = `email:not-verified:${email.getValue()}`
            batch.del([emailKey])
            batch.set(emailKey, user.getId().getValue())
            batch.expire(emailKey, this.ttl)
        }
        batch.expire(key, this.ttl)
        batch.customCommand([
            'LPUSH',
            'outbox:events',
            JSON.stringify({
                id: randomUUID(),
                aggregateType: 'User',
                aggregateId: user.getId().getValue(),
                type: eventPayload.type,
                payload: JSON.stringify(eventPayload.payload),
            }),
        ])
        await this.valkey.exec(batch, true)
    }

    async getNotVerifiedUser(id: string): Promise<{ user: User; codeHash: string; attempts: number } | null> {
        const key = `user:not-verified:${id}`
        const data = await GlideJson.get(this.valkey, key)
        const parsed = this.parseGlideJson<{ user: { usersTable: any; profilesTable: any }; codeHash: string; attempts: number }>(data)
        if (!parsed) return null

        const userPersistence = parsed.user
        if (userPersistence.usersTable.createdAt) userPersistence.usersTable.createdAt = new Date(userPersistence.usersTable.createdAt)
        if (userPersistence.usersTable.deletedAt) userPersistence.usersTable.deletedAt = new Date(userPersistence.usersTable.deletedAt)
        if (userPersistence.profilesTable.birthDate) userPersistence.profilesTable.birthDate = new Date(userPersistence.profilesTable.birthDate)
        return {
            user: UserMapper.toDomain(userPersistence.usersTable, userPersistence.profilesTable),
            codeHash: parsed.codeHash,
            attempts: parsed.attempts,
        }
    }


    async getNotVerifiedUserByEmail(email: string): Promise<{ user: User; codeHash: string; attempts: number } | null> {
        const value = await this.valkey.get(`email:not-verified:${email}`)
        if (!value) return null
        const userId = typeof value === 'string' ? value : value.toString()
        return this.getNotVerifiedUser(userId)
    }

    async removeNotVerifiedUser(id: string): Promise<void> {
        const key = `user:not-verified:${id}`
        const data = await GlideJson.get(this.valkey, key)
        const parsed = this.parseGlideJson<{ user: { usersTable: any; profilesTable: any }; codeHash: string; attempts: number }>(data)

        const keysToRemove = [key]
        if (parsed) {
            const phone = parsed.user.profilesTable.phoneNumber
            const email = parsed.user.usersTable.email
            if (phone) keysToRemove.push(`phone:not-verified:${phone}`)
            if (email) keysToRemove.push(`email:not-verified:${email}`)
        }
        await this.valkey.del(keysToRemove)
    }

    async saveForgotPasswordSecret(userId: string, codeHash: string, code: string, attempts: number, eventPayload: { type: string; payload: any }): Promise<void> {
        const key = `user:forgot-password:${userId}`
        const data = {
            codeHash,
            code,
            attempts,
        }

        await this.db.transaction(async (tx) => {
            await tx.insert(outboxEventsTable).values({
                id: randomUUID(),
                aggregateType: 'User',
                aggregateId: userId,
                type: eventPayload.type,
                payload: JSON.stringify(eventPayload.payload),
                status: 'PENDING',
            })
        })

        const batch = new Batch(true)
        batch.customCommand(['JSON.SET', key, '$', JSON.stringify(data)])
        batch.expire(key, this.ttl)
        await this.valkey.exec(batch, true)
    }

    async getForgotPasswordSecret(userId: string): Promise<{ codeHash: string; code: string; attempts: number } | null> {
        const key = `user:forgot-password:${userId}`
        const data = await GlideJson.get(this.valkey, key)
        if (!data) return null
        if (typeof data !== 'string') return null
        const parsed = JSON.parse(data)
        return {
            codeHash: parsed.codeHash,
            code: parsed.code,
            attempts: parsed.attempts,
        }
    }

    async removeForgotPasswordSecret(userId: string): Promise<void> {
        const key = `user:forgot-password:${userId}`
        await GlideJson.del(this.valkey, key)
    }

    async findProfilesByIds(ids: string[]): Promise<UserProfile[]> {
        const results = await this.db.select()
            .from(profilesTable)
            .where(inArray(profilesTable.id, ids))

        return results.map(r => UserMapper.toProfileDomain(r))
    }

    async findAll(): Promise<User[]> {
        const results = await this.db.select()
            .from(usersTable)
            .innerJoin(profilesTable, eq(usersTable.id, profilesTable.id))

        return results.map(r => UserMapper.toDomain(r.users, r.profiles))
    }

    private parseGlideJson<T>(value: GlideString | (GlideString | null)[] | null): T | null {
        if (!value) return null
        const raw = Array.isArray(value) ? value.find((v) => v !== null) : value
        if (!raw) return null
        const text = typeof raw === 'string' ? raw : raw.toString()
        return JSON.parse(text) as T
    }
}
