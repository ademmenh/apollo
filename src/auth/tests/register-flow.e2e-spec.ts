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
import { LoggerStore } from 'src/config/infrastructure/loggers'
import { Logger } from 'src/common/infrastructure/logger'

function gql(app: INestApplication, query: string, variables: Record<string, any> = {}) {
    return request(app.getHttpServer())
        .post('/graphql')
        .send({ query, variables })
}

describe('Auth - Register (E2E)', () => {
    let app: INestApplication
    let db: NodePgDatabase
    let valkey: GlideClient
    let lastVerificationCode = ''

    beforeAll(async () => {
        const dummyLogger = new Logger([new winston.transports.Console({ silent: true })])
        LoggerStore.app = dummyLogger
        LoggerStore.worker = dummyLogger
        try {
            const moduleFixture: TestingModule = await Test.createTestingModule({
                imports: [AppModule],
            })
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
        const res = await gql(app, `
            mutation Register($input: RegisterUserDTO!) {
                register(input: $input) {
                    id
                    email
                    profile {
                        fullName
                    }
                    role
                }
            }
        `, {
            input: {
                email: 'client@example.com',
                password: 'Password123!',
                fullName: 'John Doe',
                birthDate: '1990-01-01',
                phoneNumber: '0550123456',
            }
        })

        expect(res.status).toBe(200)
        expect(res.body.errors).toBeUndefined()
        expect(res.body.data.register.email).toBe('client@example.com')
        expect(res.body.data.register.profile.fullName).toBe('John Doe')
        const userId = res.body.data.register.id

        // User should NOT be in DB yet (pending verification)
        let user = await db.select().from(usersTable).where(sql`email = 'client@example.com'`)
        expect(user.length).toBe(0)

        // Verify
        const verifyRes = await gql(app, `
            mutation Verify($input: VerifyUserDTO!) {
                verify(input: $input) { message }
            }
        `, { input: { id: userId, code: lastVerificationCode } })

        expect(verifyRes.status).toBe(200)
        expect(verifyRes.body.errors).toBeUndefined()
        expect(verifyRes.body.data.verify.message).toBe('User verified successfully')

        // Now user IS in DB
        user = await db.select().from(usersTable).where(sql`email = 'client@example.com'`)
        expect(user.length).toBe(1)
    })

    it('invalid email', async () => {
        const res = await gql(app, `
            mutation Register($input: RegisterUserDTO!) {
                register(input: $input) { id }
            }
        `, {
            input: {
                email: 'invalid-email',
                password: 'Password123!',
                fullName: 'John Doe',
                birthDate: '1990-01-01',
                phoneNumber: '0550123457',
            }
        })

        expect(res.body.errors).toBeDefined()
        expect(res.body.errors.length).toBeGreaterThan(0)
    })

    it('phone number already exists', async () => {
        await gql(app, `
            mutation Register($input: RegisterUserDTO!) {
                register(input: $input) { id }
            }
        `, {
            input: {
                email: 'client1@example.com',
                password: 'Password123!',
                fullName: 'John Doe',
                birthDate: '1990-01-01',
                phoneNumber: '0550123111',
            }
        })

        const res = await gql(app, `
            mutation Register($input: RegisterUserDTO!) {
                register(input: $input) { id }
            }
        `, {
            input: {
                email: 'client2@example.com',
                password: 'Password123!',
                fullName: 'Jane Doe',
                birthDate: '1990-01-01',
                phoneNumber: '0550123111',
            }
        })

        expect(res.body.errors).toBeDefined()
    })

    it('register driver', async () => {
        const res = await gql(app, `
            mutation Register($input: RegisterUserDTO!) {
                register(input: $input) { id email profile { fullName } }
            }
        `, {
            input: {
                email: 'driver@example.com',
                password: 'Password123!',
                fullName: 'Jane Smith',
                birthDate: '1992-05-01',
                phoneNumber: '0660123456',
            }
        })

        expect(res.status).toBe(200)
        expect(res.body.errors).toBeUndefined()
        const userId = res.body.data.register.id

        let user = await db.select().from(usersTable).where(sql`email = 'driver@example.com'`)
        expect(user.length).toBe(0)

        const verifyRes = await gql(app, `
            mutation Verify($input: VerifyUserDTO!) {
                verify(input: $input) { message }
            }
        `, { input: { id: userId, code: lastVerificationCode } })

        expect(verifyRes.body.errors).toBeUndefined()
        user = await db.select().from(usersTable).where(sql`email = 'driver@example.com'`)
        expect(user.length).toBe(1)
    })

    it('missing phone number', async () => {
        const res = await gql(app, `
            mutation Register($input: RegisterUserDTO!) {
                register(input: $input) { id }
            }
        `, {
            input: {
                email: 'driver-fail@example.com',
                password: 'Password123!',
                fullName: 'Jane Smith',
                birthDate: '1992-05-01',
            }
        })

        expect(res.body.errors).toBeDefined()
    })

    it('password too short', async () => {
        const res = await gql(app, `
            mutation Register($input: RegisterUserDTO!) {
                register(input: $input) { id }
            }
        `, {
            input: {
                email: 'driver-fail-pass@example.com',
                password: '123',
                fullName: 'Jane Smith',
                birthDate: '1992-05-01',
                phoneNumber: '+1234567890',
            }
        })

        expect(res.body.errors).toBeDefined()
    })

    it('phone number already exists (driver)', async () => {
        await gql(app, `
            mutation Register($input: RegisterUserDTO!) {
                register(input: $input) { id }
            }
        `, {
            input: {
                email: 'driver1@example.com',
                password: 'Password123!',
                fullName: 'Jane Smith',
                birthDate: '1992-05-01',
                phoneNumber: '0660123111',
            }
        })

        const res = await gql(app, `
            mutation Register($input: RegisterUserDTO!) {
                register(input: $input) { id }
            }
        `, {
            input: {
                email: 'driver2@example.com',
                password: 'Password123!',
                fullName: 'Jane Smith 2',
                birthDate: '1992-05-01',
                phoneNumber: '0660123111',
            }
        })

        expect(res.body.errors).toBeDefined()
    })
})
