import { describe, it, expect, beforeAll, afterAll, beforeEach, jest, mock } from 'bun:test'
import request from 'supertest'
import * as winston from 'winston'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import * as crypto from 'crypto'
import { GlideClient } from '@valkey/valkey-glide'
import { AppModule } from '../../module'
import { usersTable, profilesTable } from 'src/users/infrastructure/schema'
import { Logger } from 'src/common/infrastructure/logger'


describe('Auth - Register (E2E)', () => {
    let app: INestApplication
    let db: NodePgDatabase
    let valkey: GlideClient
    let lastVerificationCode = ''

    beforeAll(async () => {
        const dummyLogger = new Logger([new winston.transports.Console({ silent: true })])
        try {
            const moduleFixture: TestingModule = await Test.createTestingModule({
                imports: [AppModule],
            })
                .overrideProvider('APP_LOGGER')
                .useValue(dummyLogger)
                .overrideProvider('WORKER_LOGGER')
                .useValue(dummyLogger)
                .overrideProvider('IEmailAdapter')
                .useValue({
                    sendVerificationEmail: jest.fn().mockImplementation(async () => { }),
                    sendPasswordResetEmail: jest.fn().mockImplementation(async () => { }),
                })
                .compile()
            const originalRandomBytes = crypto.randomBytes
            jest.spyOn(crypto, 'randomBytes').mockImplementation((size: number) => {
                const buf = originalRandomBytes(size)
                if (size === 3) lastVerificationCode = buf.toString('hex').toUpperCase()
                if (size === 4) lastVerificationCode = buf.toString('hex').toUpperCase().slice(0, 7)
                return buf
            })
            app = moduleFixture.createNestApplication()
            await app.init()
            db = moduleFixture.get<NodePgDatabase>('DRIZZLE_CLIENT')
            valkey = moduleFixture.get<GlideClient>('VALKEY_CLIENT')
        } catch (error) {
            console.error('[E2E beforeAll] Initialization failed:', error)
            throw error
        }
    })

    afterAll(async () => {
        mock.restore()
        if (app) await app.close()
    })

    beforeEach(async () => {
        await db.execute(sql`DELETE FROM ${profilesTable}`)
        await db.execute(sql`DELETE FROM ${usersTable}`)
        await valkey.customCommand(['FLUSHALL'])
    })

    it('register client', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'client@example.com',
                password: 'Password123!',
                fullName: 'John Doe',
                birthDate: '1990-01-01',
                phoneNumber: '0550123456',
            })

        expect(res.status).toBe(201)
        expect(res.body.data.email).toBe('client@example.com')
        expect(res.body.data.fullName).toBe('John Doe')
        const userId = res.body.data.id

        // User should NOT be in DB yet (pending verification)
        let user = await db.select().from(usersTable).where(sql`email = 'client@example.com'`)
        expect(user.length).toBe(0)

        // Verify
        const verifyRes = await request(app.getHttpServer())
            .post(`/auth/${userId}/verify`)
            .send({ code: lastVerificationCode })

        expect(verifyRes.status).toBe(200)
        expect(verifyRes.body.message).toBe('User verified successfully')

        // Now user IS in DB
        user = await db.select().from(usersTable).where(sql`email = 'client@example.com'`)
        expect(user.length).toBe(1)
    })

    it('invalid email', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'invalid-email',
                password: 'Password123!',
                fullName: 'John Doe',
                birthDate: '1990-01-01',
                phoneNumber: '0550123457',
            })

        expect(res.status).toBe(400)
    })

    it('register driver', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'driver@example.com',
                password: 'Password123!',
                fullName: 'Jane Smith',
                birthDate: '1992-05-01',
                phoneNumber: '0660123456',
            })

        expect(res.status).toBe(201)
        const userId = res.body.data.id

        let user = await db.select().from(usersTable).where(sql`email = 'driver@example.com'`)
        expect(user.length).toBe(0)

        const verifyRes = await request(app.getHttpServer())
            .post(`/auth/${userId}/verify`)
            .send({ code: lastVerificationCode })

        expect(verifyRes.status).toBe(200)
        user = await db.select().from(usersTable).where(sql`email = 'driver@example.com'`)
        expect(user.length).toBe(1)
    })

    it('missing phone number', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'driver-fail@example.com',
                password: 'Password123!',
                fullName: 'Jane Smith',
                birthDate: '1992-05-01',
            })

        expect(res.status).toBe(201) 
    })

    it('password too short', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'driver-fail-pass@example.com',
                password: '123',
                fullName: 'Jane Smith',
                birthDate: '1992-05-01',
                phoneNumber: '+1234567890',
            })

        expect(res.status).toBe(400)
    })
})
