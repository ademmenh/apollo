import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from 'bun:test'
import request from 'supertest'
import * as winston from 'winston'
import { sql } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { randomUUID } from 'crypto'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { AppModule } from '../../module'
import { IPasswordHasher } from '../../auth/domain/password-hasher'
import { User } from '../../users/domain/entity'
import { UserId } from '../../users/domain/userId'
import { Email } from '../../users/domain/email'
import { Password } from '../../users/domain/password'
import { usersTable, profilesTable, followsTable } from '../../users/infrastructure/schema'
import { postsTable } from '../../posts/infrastructure/schema'
import { IUserRepository } from '../../users/domain/repository'
import { Logger } from '../../common/infrastructure/logger'

describe('Posts - Resolver (E2E)', () => {
    let app: INestApplication
    let userRepository: IUserRepository
    let passwordHasher: IPasswordHasher
    let db: NodePgDatabase
    let graphqlPath: string

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
        graphqlPath = '/api/v1/graphql'
    })

    afterAll(async () => {
        if (app) await app.close()
    })

    beforeEach(async () => {
        await db.execute(sql`TRUNCATE TABLE ${postsTable}, ${followsTable}, ${profilesTable}, ${usersTable} RESTART IDENTITY CASCADE`)
    })

    it('should create a post', async () => {
        const password = await Password.create('Password123!', passwordHasher)
        const user = User.create(UserId.create(randomUUID()), Email.create('create@example.com'), password, 'Client', null, 'Author', new Date())
        await userRepository.save(user)

        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'create@example.com', password: 'Password123!' })
        const token = loginRes.body.tokens.accessToken

        const res = await request(app.getHttpServer())
            .post(graphqlPath)
            .set('Authorization', `Bearer ${token}`)
            .send({
                query: `mutation Create($content: String!) { createPost(content: $content) { content } }`,
                variables: { content: 'Test Post' }
            })

        expect(res.status).toBe(200)
        expect(res.body.data.createPost.content).toBe('Test Post')
    })

    it('should query all posts', async () => {
        const password = await Password.create('Password123!', passwordHasher)
        const user = User.create(UserId.create(randomUUID()), Email.create('query@example.com'), password, 'Client', null, 'Author', new Date())
        await userRepository.save(user)

        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'query@example.com', password: 'Password123!' })
        const token = loginRes.body.tokens.accessToken

        // Create post
        await request(app.getHttpServer())
            .post(graphqlPath)
            .set('Authorization', `Bearer ${token}`)
            .send({
                query: `mutation Create($content: String!) { createPost(content: $content) { id } }`,
                variables: { content: 'Post 1' }
            })

        const res = await request(app.getHttpServer())
            .post(graphqlPath)
            .set('Authorization', `Bearer ${token}`)
            .send({
                query: `query { posts(limit: 10, skip: 0) { content author { fullName, id } } }`
            })

        expect(res.status).toBe(200)
        expect(res.body.data.posts.length).toBe(1)
        expect(res.body.data.posts[0].author.fullName).toBe('Author')
    })

})
