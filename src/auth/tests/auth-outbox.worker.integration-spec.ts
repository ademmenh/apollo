import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from 'bun:test'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sql, eq } from 'drizzle-orm'
import { GlideClient } from '@valkey/valkey-glide'
import { randomUUID } from 'crypto'
import { AppModule } from '../../app.module'
import { AuthEventWorker } from '../application/auth-event.worker'
import { AuthPersistenceWorker } from '../application/auth-persistence.worker'
import { AuthRecoveryWorker } from '../application/auth-recovery.worker'
import { outboxEventsTable } from '../../users/infrastructure/persistence/schema'
import type { IEmailPort } from '../domain/email.port'
import { LoggerStore } from '../../config/infrastructure/loggers'
import { Logger } from '../../common/presentation/logger'
import * as winston from 'winston'

describe('AuthOutbox Workers (Integration)', () => {
    let app: INestApplication
    let db: NodePgDatabase
    let valkey: GlideClient
    let eventWorker: AuthEventWorker
    let persistenceWorker: AuthPersistenceWorker
    let recoveryWorker: AuthRecoveryWorker
    let emailAdapterMock: IEmailPort

    beforeAll(async () => {
        const dummyLogger = new Logger([new winston.transports.Console({ silent: true })])
        LoggerStore.app = dummyLogger
        LoggerStore.worker = dummyLogger
        emailAdapterMock = {
            sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
            sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
        }
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider('IEmailAdapter')
            .useValue(emailAdapterMock)
            .compile()

        app = moduleFixture.createNestApplication()
        await app.init()
        db = moduleFixture.get<NodePgDatabase>('DRIZZLE_CLIENT')
        valkey = moduleFixture.get<GlideClient>('VALKEY_CLIENT')
        eventWorker = moduleFixture.get<AuthEventWorker>(AuthEventWorker)
        persistenceWorker = moduleFixture.get<AuthPersistenceWorker>(AuthPersistenceWorker)
        recoveryWorker = moduleFixture.get<AuthRecoveryWorker>(AuthRecoveryWorker)
    })

    afterAll(async () => {
        if (app) await app.close()
    })

    beforeEach(async () => {
        await valkey.customCommand(['FLUSHALL'])
        await db.execute(sql`DELETE FROM ${outboxEventsTable}`)
    })

    describe('AuthEventWorker', () => {
        it('should process SESSION_CREATED event from cache and store session', async () => {
            const event = {
                type: 'SESSION_CREATED',
                payload: {
                    userId: 'user-123',
                    hashedRefreshToken: 'hashed-token-abc',
                    userAgent: 'test-agent',
                    ipAddress: '127.0.0.1',
                    role: 'Client',
                },
            }
            await valkey.customCommand(['LPUSH', 'outbox:events', JSON.stringify(event)])
            await eventWorker.handleEvents()
            // Event should be consumed from cache
            const remaining = await valkey.customCommand(['LLEN', 'outbox:events'])
            expect(remaining).toBe(0)
            // Processing queue should be empty (event was acknowledged)
            const processing = await valkey.customCommand(['LLEN', 'outbox:processing'])
            expect(processing).toBe(0)
            // Session should exist in Valkey
            const sessionData = await valkey.customCommand(['JSON.GET', 'session:hashed-token-abc', '$'])
            expect(sessionData).toBeDefined()
            const parsed = JSON.parse(sessionData as string)
            const session = Array.isArray(parsed) ? parsed[0] : parsed
            expect(session.userId).toBe('user-123')
            expect(session.role).toBe('Client')
        })

        it('should process VERIFICATION_EMAIL_REQUESTED event from cache', async () => {
            const event = {
                type: 'VERIFICATION_EMAIL_REQUESTED',
                payload: {
                    to: 'user@example.com',
                    fullName: 'John Doe',
                    code: 'ABC123',
                },
            }
            await valkey.customCommand(['LPUSH', 'outbox:events', JSON.stringify(event)])
            await eventWorker.handleEvents()
            expect(emailAdapterMock.sendVerificationEmail).toHaveBeenCalledWith(
                'user@example.com', 'John Doe', 'ABC123',
            )
        })

        it('should process PASSWORD_RESET_EMAIL_REQUESTED event from cache', async () => {
            const event = {
                type: 'PASSWORD_RESET_EMAIL_REQUESTED',
                payload: {
                    to: 'user@example.com',
                    fullName: 'John Doe',
                    code: 'RESET789',
                },
            }
            await valkey.customCommand(['LPUSH', 'outbox:events', JSON.stringify(event)])
            await eventWorker.handleEvents()
            expect(emailAdapterMock.sendPasswordResetEmail).toHaveBeenCalledWith(
                'user@example.com', 'John Doe', 'RESET789',
            )
        })
    })

    describe('AuthPersistenceWorker', () => {
        it('should process SESSION_CREATED event from database and mark as processed', async () => {
            const eventId = randomUUID()
            await db.insert(outboxEventsTable).values({
                id: eventId,
                aggregateType: 'User',
                aggregateId: 'user-456',
                type: 'SESSION_CREATED',
                payload: JSON.stringify({
                    userId: 'user-456',
                    hashedRefreshToken: 'hashed-token-xyz',
                    userAgent: 'persistence-agent',
                    ipAddress: '10.0.0.1',
                    role: 'Driver',
                }),
                status: 'PENDING',
            })
            await persistenceWorker.handlePersistenceEvents()
            // Event should be marked as PROCESSED
            const events = await db.select()
                .from(outboxEventsTable)
                .where(eq(outboxEventsTable.id, eventId))
            expect(events.length).toBe(1)
            expect(events[0].status).toBe('PROCESSED')
            expect(events[0].processedAt).toBeDefined()
            // Session should exist in Valkey
            const sessionData = await valkey.customCommand(['JSON.GET', 'session:hashed-token-xyz', '$'])
            expect(sessionData).toBeDefined()
            const parsed = JSON.parse(sessionData as string)
            const session = Array.isArray(parsed) ? parsed[0] : parsed
            expect(session.userId).toBe('user-456')
            expect(session.role).toBe('Driver')
        })
    })

    describe('AuthRecoveryWorker', () => {
        it('should move stuck events from processing back to events queue', async () => {
            // Simulate stuck events in the processing queue
            await valkey.customCommand(['LPUSH', 'outbox:processing', '{"type":"SESSION_CREATED","payload":{}}'])
            await valkey.customCommand(['LPUSH', 'outbox:processing', '{"type":"SESSION_CREATED","payload":{}}'])
            await recoveryWorker.recover()
            // Processing queue should be empty
            const processingLen = await valkey.customCommand(['LLEN', 'outbox:processing'])
            expect(processingLen).toBe(0)
            // Events should be back in the main queue
            const eventsLen = await valkey.customCommand(['LLEN', 'outbox:events'])
            expect(eventsLen).toBe(2)
        })

        it('should return 0 when no stuck events exist', async () => {
            await recoveryWorker.recover()
            const eventsLen = await valkey.customCommand(['LLEN', 'outbox:events'])
            expect(eventsLen).toBe(0)
        })
    })
})
