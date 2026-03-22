import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from 'bun:test'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { AppModule } from '../../app.module'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { User } from '../../users/domain/user.aggregate'
import { UserId } from '../../users/domain/value-objects/user-id.vo'
import { Email } from '../../users/domain/value-objects/email.vo'
import { Password } from '../../users/domain/value-objects/password.vo'
import { PhoneNumber } from '../../users/domain/value-objects/phone-number.vo'
import { usersTable } from '../../users/infrastructure/persistence/schema'
import { sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import request from 'supertest'
import { GlideClient } from '@valkey/valkey-glide'
import { IUserRepository } from '../../users/domain/user-repository.interface'
import { IPasswordHasher } from '../../auth/domain/password-hasher.interface'
import { LoggerStore } from '../../config/infrastructure/loggers'
import { Logger } from '../../common/presentation/logger'
import * as winston from 'winston'

function gql(app: INestApplication, query: string, variables: Record<string, any> = {}) {
    return request(app.getHttpServer())
        .post('/graphql')
        .send({ query, variables })
}

describe('Auth - Login (E2E)', () => {
    let app: INestApplication
    let userRepository: IUserRepository
    let passwordHasher: IPasswordHasher
    let db: NodePgDatabase
    let valkey: GlideClient

    beforeAll(async () => {
        const dummyLogger = new Logger([new winston.transports.Console({ silent: true })])
        LoggerStore.app = dummyLogger
        LoggerStore.worker = dummyLogger
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider('IEmailAdapter')
            .useValue({ sendVerificationEmail: jest.fn().mockResolvedValue(undefined) })
            .compile()
        app = module.createNestApplication()
        await app.init()
        userRepository = module.get<IUserRepository>('IUserRepository')
        passwordHasher = module.get<IPasswordHasher>('IPasswordHasher')
        db = module.get<NodePgDatabase>('DRIZZLE_CLIENT')
        valkey = module.get<GlideClient>('VALKEY_CLIENT')
    })

    afterAll(async () => {
        await app.close()
    })

    beforeEach(async () => {
        await db.execute(sql`DELETE FROM ${usersTable}`)
        await valkey.customCommand(['FLUSHALL'])
    })

    it('login', async () => {
        const password = await Password.create('Password123!', passwordHasher)
        const user = User.create(UserId.create(randomUUID()), Email.create('login@example.com'), password, 'Client', PhoneNumber.create('0550123456'), 'John Doe', new Date('1990-01-01'))
        await userRepository.save(user, { type: 'USER_VERIFIED', payload: { userId: user.getId().getValue(), hashedRefreshToken: 'dummy', userAgent: 'dummy', ipAddress: '127.0.0.1', role: user.getRole() } })

        const res = await gql(app, `
            mutation Login($input: LoginInput!) {
                login(input: $input) {
                    user { id email fullName }
                    accessToken
                    refreshToken
                }
            }
        `, {
            input: {
                email: 'login@example.com',
                password: 'Password123!',
            }
        })

        expect(res.status).toBe(200)
        expect(res.body.errors).toBeUndefined()
        expect(res.body.data.login.accessToken).toBeDefined()
        expect(res.body.data.login.refreshToken).toBeDefined()
        expect(res.body.data.login.user.email).toBe('login@example.com')
    })

    it('invalid credentials', async () => {
        const res = await gql(app, `
            mutation Login($input: LoginInput!) {
                login(input: $input) {
                    user { id }
                    accessToken
                }
            }
        `, {
            input: {
                email: 'nonexistent@example.com',
                password: 'Password123!',
            }
        })

        expect(res.body.errors).toBeDefined()
        expect(res.body.errors.length).toBeGreaterThan(0)
    })
})
