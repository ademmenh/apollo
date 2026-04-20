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
import { LoggerStore } from 'src/config/infrastructure/loggers'
import { Logger } from 'src/common/infrastructure/logger'

function gql(app: INestApplication, query: string, variables: Record<string, any> = {}) {
    return request(app.getHttpServer())
        .post('/graphql')
        .send({ query, variables })
}

describe('Auth - Password Flow (E2E)', () => {
    let app: INestApplication
    let db: NodePgDatabase
    let valkeyClient: GlideClient
    let lastVerificationCode = ''

    beforeAll(async () => {
        const dummyLogger = new Logger([new winston.transports.Console({ silent: true })])
        LoggerStore.app = dummyLogger
        LoggerStore.worker = dummyLogger
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
            .overrideProvider('IEmailAdapter')
            .useValue({
                sendVerificationEmail: jest.fn().mockImplementation(async () => { }),
            })
            .compile()

        app = moduleFixture.createNestApplication()
        await app.init()

        db = moduleFixture.get<NodePgDatabase>('DRIZZLE_CLIENT')
        valkeyClient = moduleFixture.get<GlideClient>('VALKEY_CLIENT')
    })

    afterAll(async () => {
        jest.restoreAllMocks()
        await app.close()
    })

    beforeEach(async () => {
        await db.execute(sql`DELETE FROM ${profilesTable}`)
        await db.execute(sql`DELETE FROM ${usersTable}`)
        await valkeyClient.customCommand(['FLUSHALL'])
    })

    async function registerAndVerify(email: string, password: string, phone: string) {
        const regRes = await gql(app, `
            mutation Register($input: RegisterUserDTO!) {
                register(input: $input) { id }
            }
        `, {
            input: {
                email,
                password,
                fullName: 'Test User',
                birthDate: '1990-01-01',
                phoneNumber: phone,
            }
        })
        const userId = regRes.body.data.register.id
        const verifyRes = await gql(app, `
            mutation Verify($input: VerifyUserDTO!) {
                verify(input: $input) { message }
            }
        `, { input: { id: userId, code: lastVerificationCode } })
        expect(verifyRes.body.errors).toBeUndefined()

        const loginRes = await gql(app, `
            mutation Login($input: LoginDTO!) {
                login(input: $input) { accessToken }
            }
        `, { input: { email, password } })
        expect(loginRes.body.errors).toBeUndefined()

        return {
            userId,
            accessToken: loginRes.body.data.login.accessToken,
        }
    }

    it('forgot password', async () => {
        const { userId } = await registerAndVerify('forgot@example.com', 'Password123!', '0550111222')
        // Request reset code
        const requestRes = await gql(app, `
            mutation RequestForgotPassword($email: String!) {
                requestForgotPassword(email: $email) { message }
            }
        `, { email: 'forgot@example.com' })
        expect(requestRes.body.errors).toBeUndefined()
        expect(requestRes.body.data.requestForgotPassword.message).toBe('Reset code sent to your email')
        // Reset password
        const resetRes = await gql(app, `
            mutation ResetForgotPassword($input: ForgotPasswordResetDTO!) {
                resetForgotPassword(input: $input) { message }
            }
        `, {
            input: {
                id: userId,
                secret: lastVerificationCode,
                newPassword: 'NewPassword321!',
            }
        })
        expect(resetRes.body.errors).toBeUndefined()
        expect(resetRes.body.data.resetForgotPassword.message).toBe('Password reset successfully')
        // Login with new password
        const loginRes = await gql(app, `
            mutation Login($input: LoginDTO!) {
                login(input: $input) {
                    user { id }
                    accessToken
                }
            }
        `, {
            input: {
                email: 'forgot@example.com',
                password: 'NewPassword321!',
            }
        })
        expect(loginRes.body.errors).toBeUndefined()
        expect(loginRes.body.data.login.accessToken).toBeDefined()
    })

    it('change password', async () => {
        const { userId, accessToken } = await registerAndVerify('change@example.com', 'OldPassword123!', '0550333444')
        // Login to confirm current password works
        const loginRes = await gql(app, `
            mutation Login($input: LoginDTO!) {
                login(input: $input) { accessToken }
            }
        `, { input: { email: 'change@example.com', password: 'OldPassword123!' } })
        expect(loginRes.body.errors).toBeUndefined()
        const token = loginRes.body.data.login.accessToken
        // Change password (needs auth)
        const changeRes = await request(app.getHttpServer())
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send({
                query: `
                    mutation ChangePassword($input: ResetPasswordDTO!) {
                        changePassword(input: $input) { message }
                    }
                `,
                variables: {
                    input: {
                        id: userId,
                        oldPassword: 'OldPassword123!',
                        newPassword: 'BrandNewPassword321!',
                    }
                }
            })
        expect(changeRes.body.errors).toBeUndefined()
        expect(changeRes.body.data.changePassword.message).toBe('Password changed successfully')
        // Old password should fail
        const loginFail = await gql(app, `
            mutation Login($input: LoginDTO!) {
                login(input: $input) { accessToken }
            }
        `, { input: { email: 'change@example.com', password: 'OldPassword123!' } })
        expect(loginFail.body.errors).toBeDefined()
        // New password should work
        const loginSuccess = await gql(app, `
            mutation Login($input: LoginDTO!) {
                login(input: $input) { accessToken }
            }
        `, { input: { email: 'change@example.com', password: 'BrandNewPassword321!' } })
        expect(loginSuccess.body.errors).toBeUndefined()
        expect(loginSuccess.body.data.login.accessToken).toBeDefined()
    })
})
