import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'bun:test'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { SessionsRepository } from '../infrastructure/persistence/session.repository'
import { Session } from '../domain/session.entity'
import { GlideClient, GlideJson } from '@valkey/valkey-glide'
import { ValkeyModule } from '../../config/infrastructure/valkey.module'

describe('SessionsRepository (Integration)', () => {
    let repository: SessionsRepository
    let client: GlideClient

    beforeAll(() => {
        process.env.CACHE_HOST = 'localhost'
    })

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule.forRoot({ isGlobal: true }), ValkeyModule],
            providers: [SessionsRepository],
        }).compile()
        repository = module.get<SessionsRepository>(SessionsRepository)
        client = module.get<GlideClient>('VALKEY_CLIENT')
    })

    afterAll(async () => {
        // if (client) client.close()
        client.close()
    })

    it('save session', async () => {
        const session = new Session('user-123', 'hashed-refresh-token', 'test-agent', '127.0.0.1', 'Client')
        await repository.save(session)
        const key = `session:${session.hashedRefreshToken}`
        const storedDataStr = await GlideJson.get(client, key, { path: '$' })
        if (storedDataStr === null) throw new Error('Stored data should not be null')
        const retrievedSession = await repository.findByHash(session.hashedRefreshToken)
        if (!retrievedSession) throw new Error('Session should not be null')
        expect(retrievedSession.userId).toBe('user-123')
        expect(retrievedSession.hashedRefreshToken).toBe('hashed-refresh-token')
    })

    it('retrieve session', async () => {
        const session = new Session('user-456', 'hash-456', 'test-agent', '127.0.0.1', 'Client')
        await repository.save(session)
        const result = await repository.findByHash('hash-456')
        if (!result) throw new Error('Session should not be null')
        expect(result.userId).toBe('user-456')
        expect(result.hashedRefreshToken).toBe('hash-456')
        expect(result).toBeInstanceOf(Session)
    })

    it('session not found', async () => {
        const result = await repository.findByHash('non-existent')
        if (result !== null) throw new Error('Session should not be null')
    })

    it('find all by userId', async () => {
        const session1 = new Session('user-multi', 'hash-1', 'agent1', '127.0.0.1', 'Client')
        const session2 = new Session('user-multi', 'hash-2', 'agent2', '127.0.0.1', 'Client')
        await repository.save(session1)
        await repository.save(session2)
        const sessions = await repository.findAllByUserId('user-multi')
        expect(sessions.length).toBe(2)
        const hashes = sessions.map((s) => s.hashedRefreshToken)
        expect(hashes).toContain('hash-1')
        expect(hashes).toContain('hash-2')
    })

    it('delete by hash', async () => {
        const session = new Session('user-del', 'hash-del', 'agent', '127.0.0.1', 'Client')
        await repository.save(session)
        let result = await repository.findByHash('hash-del')
        if (result === null) throw new Error('Session should not be null')
        await repository.deleteByHash('hash-del')
        result = await repository.findByHash('hash-del')
        if (result !== null) throw new Error('Session should not be null')
    })

    it('delete all by userId', async () => {
        const session1 = new Session('user-delall', 'hash-da1', 'agent', '127.0.0.1', 'Client')
        const session2 = new Session('user-delall', 'hash-da2', 'agent', '127.0.0.1', 'Client')
        await repository.save(session1)
        await repository.save(session2)
        let sessions = await repository.findAllByUserId('user-delall')
        expect(sessions.length).toBe(2)
        await repository.deleteByUserId('user-delall')
        sessions = await repository.findAllByUserId('user-delall')
        expect(sessions.length).toBe(0)
    })

    it('rotate session', async () => {
        const sessionOld = new Session('user-rot', 'hash-old', 'agent', '127.0.0.1', 'Client')
        const sessionNew = new Session('user-rot', 'hash-new', 'agent', '127.0.0.1', 'Client')
        await repository.save(sessionOld)
        const result = await repository.findByHash('hash-old')
        if (result === null) throw new Error('Session should not be null')
        await repository.rotate('hash-old', sessionNew)
        const resultOld = await repository.findByHash('hash-old')
        if (resultOld !== null) throw new Error('Session should not be null')
        const resultNew = await repository.findByHash('hash-new')
        if (resultNew === null) throw new Error('Session should not be null')
        expect(resultNew?.hashedRefreshToken).toBe('hash-new')
    })
})
