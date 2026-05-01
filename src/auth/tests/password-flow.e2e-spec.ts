import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from 'bun:test'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import * as winston from 'winston'
import * as crypto from 'crypto'
import { sql } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { AppModule } from '../../module'
import { GlideClient } from '@valkey/valkey-glide'
import { usersTable, profilesTable } from 'src/users/infrastructure/schema'
import { Logger } from 'src/common/infrastructure/logger'

describe('Auth - Password Flow (E2E)', () => {
    let app: INestApplication
    let db: NodePgDatabase
    let valkeyClient: GlideClient
    let lastVerificationCode = ''

    beforeAll(async () => {
        const dummyLogger = new Logger([new winston.transports.Console({ silent: true })])
        const originalRandomBytes = crypto.randomBytes
        jest.spyOn(crypto, 'randomBytes').mockImplementation((size: number) => {
            const buf = originalRandomBytes(size)
            if (size === 3) lastVerificationCode = buf.toString('hex').toUpperCase()
            if (size === 4) lastVerificationCode = buf.toString('hex').toUpperCase().slice(0, 7)
            return buf
        })

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

        app = moduleFixture.createNestApplication()
        await app.init()

        db = moduleFixture.get<NodePgDatabase>('DRIZZLE_CLIENT')
        valkeyClient = moduleFixture.get<GlideClient>('VALKEY_CLIENT')
    })

    afterAll(async () => {
        jest.restoreAllMocks()
        if (app) await app.close()
    })

    beforeEach(async () => {
        await db.execute(sql`DELETE FROM ${profilesTable}`)
        await db.execute(sql`DELETE FROM ${usersTable}`)
        await valkeyClient.customCommand(['FLUSHALL'])
    })

    async function registerAndVerify(email: string, password: string, phone: string) {
        const regRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email,
                password,
                fullName: 'Test User',
                birthDate: '1990-01-01',
                phoneNumber: phone,
            })
        const userId = regRes.body.data.id
        const verifyRes = await request(app.getHttpServer())
            .post(`/auth/${userId}/verify`)
            .send({ code: lastVerificationCode })
        
        expect(verifyRes.status).toBe(200)

        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email, password })
        
        expect(loginRes.status).toBe(200)

        return {
            userId,
            accessToken: loginRes.body.tokens.accessToken,
        }
    }

    it('forgot password', async () => {
        const { userId } = await registerAndVerify('forgot@example.com', 'Password123!', '0550111222')
        
        // Request reset code
        const requestRes = await request(app.getHttpServer())
            .post('/auth/request-forgot-password')
            .send({ email: 'forgot@example.com' })
        
        expect(requestRes.status).toBe(200)
        expect(requestRes.body.message).toBe('Reset code sent to your email')

        // Reset password
        const resetRes = await request(app.getHttpServer())
            .post('/auth/forgot-password')
            .send({
                id: userId,
                secret: lastVerificationCode,
                newPassword: 'NewPassword321!',
            })
        
        expect(resetRes.status).toBe(200)
        expect(resetRes.body.message).toBe('Password reset successfully')

        // Login with new password
        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: 'forgot@example.com',
                password: 'NewPassword321!',
            })
        
        expect(loginRes.status).toBe(200)
        expect(loginRes.body.tokens.accessToken).toBeDefined()
    })

    it('change password', async () => {
        const { userId, accessToken } = await registerAndVerify('change@example.com', 'OldPassword123!', '0550333444')
        
        // Change password (needs auth)
        const changeRes = await request(app.getHttpServer())
            .post('/auth/change-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                oldPassword: 'OldPassword123!',
                newPassword: 'BrandNewPassword321!',
            })
        
        expect(changeRes.status).toBe(200)
        expect(changeRes.body.message).toBe('Password changed successfully')

        // Old password should fail
        const loginFail = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'change@example.com', password: 'OldPassword123!' })
        
        expect(loginFail.status).toBe(401)

        // New password should work
        const loginSuccess = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'change@example.com', password: 'BrandNewPassword321!' })
        
        expect(loginSuccess.status).toBe(200)
        expect(loginSuccess.body.tokens.accessToken).toBeDefined()
    })
})
