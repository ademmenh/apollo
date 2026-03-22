import { Injectable, Inject } from '@nestjs/common'
import { ISessionRepository } from '../../domain/session-repository.interface'
import { Session } from '../../domain/session.entity'
import { TUserRole } from '../../../users/domain/value-objects/user-role.vo'
import { GlideClient, GlideJson, GlideString, Batch } from '@valkey/valkey-glide'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class SessionsRepository implements ISessionRepository {
    private readonly ttl: number

    constructor(
        @Inject('VALKEY_CLIENT') private readonly valkey: GlideClient,
        private readonly configService: ConfigService,
    ) {
        this.ttl = this.configService.getOrThrow<number>('CACHE_TTL')
    }

    private parseGlideJson<T>(value: GlideString | (GlideString | null)[] | null): T | null {
        if (!value) return null
        const raw = Array.isArray(value) ? value.find((v) => v !== null) : value
        if (!raw) return null
        const text = typeof raw === 'string' ? raw : raw.toString()
        try {
            return JSON.parse(text) as T
        } catch {
            return null
        }
    }

    async save(session: Session): Promise<void> {
        const key = this.getSessionKey(session.hashedRefreshToken)
        const userSessionsKey = this.getUserSessionsKey(session.userId)
        const data = {
            userId: session.userId,
            hashedRefreshToken: session.hashedRefreshToken,
            userAgent: session.userAgent,
            ipAddress: session.ipAddress,
            role: session.role,
        }
        const batch = new Batch(true)
        batch.customCommand(['JSON.SET', key, '$', JSON.stringify(data)])
        batch.sadd(userSessionsKey, [session.hashedRefreshToken])
        batch.expire(key, this.ttl)
        batch.expire(userSessionsKey, this.ttl)
        await this.valkey.exec(batch, true)
    }

    async findByHash(hash: string): Promise<Session | null> {
        const key = this.getSessionKey(hash)
        const dataStr = await GlideJson.get(this.valkey, key, { path: '$' })
        type SessionDTO = {
            userId: string
            hashedRefreshToken: string
            userAgent: string
            ipAddress: string
            role: string
        }
        const parsed = this.parseGlideJson<SessionDTO | SessionDTO[]>(dataStr)
        if (!parsed) return null
        const data = Array.isArray(parsed) ? parsed[0] : parsed
        if (!data) return null
        return new Session(data.userId, data.hashedRefreshToken, data.userAgent, data.ipAddress, data.role as TUserRole)
    }

    async findAllByUserId(userId: string): Promise<Session[]> {
        const userKey = this.getUserSessionsKey(userId)
        const keys = await this.valkey.smembers(userKey)
        if (!keys || keys.size === 0) return []
        // Batch JSON.GET requests
        const batch = new Batch(true)
        for (const key of keys) {
            const sessionId = typeof key === 'string' ? key : key.toString()
            const sessionKey = this.getSessionKey(sessionId)
            batch.customCommand(['JSON.GET', sessionKey, '$'])
        }
        const results = await this.valkey.exec(batch, true)
        if (!results) return []
        const sessions: Session[] = []
        for (const result of results) {
            if (!result) continue
            const dataStr = typeof result === 'string' ? result : result.toString()
            const parsed = this.parseGlideJson<Session | Session[]>(dataStr)
            if (!parsed) continue
            const data = Array.isArray(parsed) ? parsed[0] : parsed
            if (!data) continue
            const session = new Session(data.userId, data.hashedRefreshToken, data.userAgent, data.ipAddress, data.role as TUserRole)
            sessions.push(session)
        }
        return sessions
    }

    async deleteByHash(hash: string): Promise<void> {
        const sessionKey = this.getSessionKey(hash)
        const session = await this.findByHash(hash)
        if (!session) return
        const userSessionsKey = this.getUserSessionsKey(session.userId)
        const tx = new Batch(true)
        tx.srem(userSessionsKey, [hash])
        tx.del([sessionKey])
        await this.valkey.exec(tx, true)
    }

    async deleteByUserId(userId: string): Promise<void> {
        const userKey = this.getUserSessionsKey(userId)
        const hashes = await this.valkey.smembers(userKey)
        if (!hashes || hashes.size === 0) return
        const batch = new Batch(true)
        for (const hash of hashes) {
            const sessionId = typeof hash === 'string' ? hash : hash.toString()
            batch.del([this.getSessionKey(sessionId)])
        }
        batch.del([userKey])
        await this.valkey.exec(batch, true)
    }

    async rotate(oldHash: string, newSession: Session): Promise<void> {
        const oldSessionKey = this.getSessionKey(oldHash)
        const newSessionKey = this.getSessionKey(newSession.hashedRefreshToken)
        const userSessionsKey = this.getUserSessionsKey(newSession.userId)
        const newData = {
            userId: newSession.userId,
            hashedRefreshToken: newSession.hashedRefreshToken,
            userAgent: newSession.userAgent,
            ipAddress: newSession.ipAddress,
            role: newSession.role,
        }
        const batch = new Batch(true)
        batch.del([oldSessionKey])
        batch.srem(userSessionsKey, [oldHash])
        batch.customCommand(['JSON.SET', newSessionKey, '$', JSON.stringify(newData)])
        batch.sadd(userSessionsKey, [newSession.hashedRefreshToken])
        batch.expire(newSessionKey, this.ttl)
        batch.expire(userSessionsKey, this.ttl)
        await this.valkey.exec(batch, true)
    }

    private getSessionKey(hash: string): string {
        return `session:${hash}`
    }

    private getUserSessionsKey(userId: string): string {
        return `user_sessions:${userId}`
    }
}
