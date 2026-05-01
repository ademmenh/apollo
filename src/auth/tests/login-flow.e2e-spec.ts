import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from 'bun:test'
import request from 'supertest'
import * as winston from 'winston'
import { sql } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { randomUUID } from 'crypto'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { AppModule } from '../../module'
import { IPasswordHasher } from '../domain/password-hasher'
import { User } from 'src/users/domain/entity'
import { UserId } from 'src/users/domain/userId'
import { Email } from 'src/users/domain/email'
import { Password } from 'src/users/domain/password'
import { PhoneNumber } from 'src/users/domain/phone-number'
import { usersTable, profilesTable } from 'src/users/infrastructure/schema'
import { GlideClient } from '@valkey/valkey-glide'
import { IUserRepository } from 'src/users/domain/repository'
import { Logger } from 'src/common/infrastructure/logger'

describe('Auth - Login (E2E)', () => {
    let app: INestApplication
    let userRepository: IUserRepository
    let passwordHasher: IPasswordHasher
    let db: NodePgDatabase
    let valkey: GlideClient

    beforeAll(async () => {
        const dummyLogger = new Logger([new winston.transports.Console({ silent: true })])
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider('APP_LOGGER')
            .useValue(dummyLogger)
            .overrideProvider('WORKER_LOGGER')
            .useValue(dummyLogger)
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
        if (app) await app.close()
    })

    beforeEach(async () => {
        await db.execute(sql`TRUNCATE TABLE ${profilesTable}, ${usersTable} RESTART IDENTITY CASCADE`)
        await valkey.customCommand(['FLUSHALL'])
    })

    it('login', async () => {
        const password = await Password.create('Password123!', passwordHasher)
        const user = User.create(UserId.create(randomUUID()), Email.create('login@example.com'), password, 'Client', PhoneNumber.create('0550123456'), 'John Doe', new Date('1990-01-01'))
        await userRepository.save(user)

        const res = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: 'login@example.com',
                password: 'Password123!',
            })

        expect(res.status).toBe(200)
        expect(res.body.tokens.accessToken).toBeDefined()
        expect(res.body.tokens.refreshToken).toBeDefined()
        expect(res.body.data.fullName).toBe('John Doe')
    })

    it('invalid credentials', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: 'nonexistent@example.com',
                password: 'Password123!',
            })

        expect(res.status).toBe(401)
    })
})
