import { Inject, Injectable } from '@nestjs/common'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { Batch, GlideClient, GlideJson, GlideString } from '@valkey/valkey-glide'
import { IUserRepository } from '../../domain/user-repository.interface'
import { User } from '../../domain/user.aggregate'
import { UserMapper } from './user.mapper'
import { usersTable, outboxEventsTable } from './schema'
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

    async save(user: User, eventPayload: { type: string; payload: any }): Promise<User> {
        const persistenceModel = UserMapper.toPersistence(user)
        await this.db.transaction(async (tx) => {
            await tx.insert(usersTable).values(persistenceModel).onConflictDoUpdate({
                target: usersTable.id,
                set: persistenceModel,
            })
            await tx.insert(outboxEventsTable).values({
                id: randomUUID(),
                aggregateType: 'User',
                aggregateId: user.getId().getValue(),
                type: eventPayload.type,
                payload: JSON.stringify(eventPayload.payload),
                status: 'PENDING',
            })
        })
        return user
    }

    async update(user: User): Promise<User> {
        const persistenceModel = UserMapper.toPersistence(user)
        await this.db.update(usersTable).set(persistenceModel).where(eq(usersTable.id, user.getId().getValue()))
        return user
    }

    async findById(id: string): Promise<User | null> {
        const result = await this.db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
        if (result.length === 0) return null
        return UserMapper.toDomain(result[0])
    }

    async findByEmail(email: string): Promise<User | null> {
        const result = await this.db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1)
        if (result.length === 0) return null
        return UserMapper.toDomain(result[0])
    }

    async findByPhone(phone: string): Promise<User | null> {
        const result = await this.db.select().from(usersTable).where(eq(usersTable.phoneNumber, phone)).limit(1)
        if (result.length === 0) return null
        return UserMapper.toDomain(result[0])
    }

    async saveNotVerified(user: User, codeHash: string, attempts: number, eventPayload: { type: string; payload: any }): Promise<void> {
        const key = `user:not-verified:${user.getId().getValue()}`
        const phoneKey = `phone:not-verified:${user.getPhoneNumber().getValue()}`
        const data = {
            user: UserMapper.toPersistence(user),
            codeHash,
            attempts,
        }

        const batch = new Batch(true)
        batch.customCommand(['JSON.SET', key, '$', JSON.stringify(data)])
        batch.del([phoneKey])
        batch.set(phoneKey, user.getId().getValue())
        batch.expire(phoneKey, this.ttl)
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
        if (!data) return null
        if (typeof data !== 'string') return null
        const parsed = JSON.parse(data)
        const userPersistence = parsed.user
        if (userPersistence.createdAt) userPersistence.createdAt = new Date(userPersistence.createdAt)
        if (userPersistence.birthDate) userPersistence.birthDate = new Date(userPersistence.birthDate)
        if (userPersistence.deletedAt) userPersistence.deletedAt = new Date(userPersistence.deletedAt)
        return {
            user: UserMapper.toDomain(userPersistence as any),
            codeHash: parsed.codeHash,
            attempts: parsed.attempts,
        }
    }

    async getNotVerifiedUserByPhone(phone: string): Promise<{ user: User; codeHash: string; attempts: number } | null> {
        const userId = await this.valkey.get(`phone:not-verified:${phone}`)
        if (!userId) return null
        const key = `user:not-verified:${userId}`
        const data = await GlideJson.get(this.valkey, key)
        const userd = this.parseGlideJson<{ user: any; codeHash: string; attempts: number }>(data)
        if (!userd) return null
        const userPersistence = userd.user
        if (userPersistence.createdAt) userPersistence.createdAt = new Date(userPersistence.createdAt)
        if (userPersistence.birthDate) userPersistence.birthDate = new Date(userPersistence.birthDate)
        if (userPersistence.deletedAt) userPersistence.deletedAt = new Date(userPersistence.deletedAt)
        return {
            user: UserMapper.toDomain(userPersistence),
            codeHash: userd.codeHash,
            attempts: userd.attempts,
        }
    }

    async removeNotVerifiedUser(id: string): Promise<void> {
        const key = `user:not-verified:${id}`
        await GlideJson.del(this.valkey, key)
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

    private parseGlideJson<T>(value: GlideString | (GlideString | null)[] | null): T | null {
        if (!value) return null
        const raw = Array.isArray(value) ? value.find((v) => v !== null) : value
        if (!raw) return null
        const text = typeof raw === 'string' ? raw : raw.toString()
        return JSON.parse(text) as T
    }
}
