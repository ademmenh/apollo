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
import { GlideClient } from '@valkey/valkey-glide'
import { IUserRepository } from '../../users/domain/repository'
import { Logger } from '../../common/infrastructure/logger'

describe('Users - Resolver (E2E)', () => {
    let app: INestApplication
    let userRepository: IUserRepository
    let passwordHasher: IPasswordHasher
    let db: NodePgDatabase
    let valkey: GlideClient
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
        valkey = module.get<GlideClient>('VALKEY_CLIENT')
        graphqlPath = '/api/v1/graphql' // Assuming version 1 for tests
    })

    afterAll(async () => {
        if (app) await app.close()
    })

    beforeEach(async () => {
        await db.execute(sql`DELETE FROM ${followsTable}`)
        await db.execute(sql`DELETE FROM ${profilesTable}`)
        await db.execute(sql`DELETE FROM ${usersTable}`)
        await valkey.customCommand(['FLUSHALL'])
    })

    it('should follow a user and list followers/following', async () => {
        // 1. Create two users
        const password = await Password.create('Password123!', passwordHasher)
        const user1 = User.create(UserId.create(randomUUID()), Email.create('user1@example.com'), password, 'Client', null, 'User One', new Date('1990-01-01'))
        const user2 = User.create(UserId.create(randomUUID()), Email.create('user2@example.com'), password, 'Client', null, 'User Two', new Date('1992-01-01'))
        await userRepository.save(user1)
        await userRepository.save(user2)

        // 2. Login as user 1 to get token
        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'user1@example.com', password: 'Password123!' })

        const token = loginRes.body.tokens.accessToken

        // 3. Follow user 2 via GraphQL mutation
        const followMutation = {
            query: `
                mutation Follow($id: ID!) {
                    followUser(followingId: $id) {
                        message
                    }
                }
            `,
            variables: { id: user2.getId().getValue() }
        }

        const followRes = await request(app.getHttpServer())
            .post(graphqlPath)
            .set('Authorization', `Bearer ${token}`)
            .send(followMutation)

        expect(followRes.status).toBe(200)
        expect(followRes.body.data.followUser.message).toBe('Successfully followed user')

        // 4. Query followers of user 2
        const followersQuery = {
            query: `
                query GetFollowers($id: ID!) {
                    followers(userId: $id, limit: 10, skip: 0) {
                        fullName
                    }
                }
            `,
            variables: { id: user2.getId().getValue() }
        }

        const followersRes = await request(app.getHttpServer())
            .post(graphqlPath)
            .set('Authorization', `Bearer ${token}`)
            .send(followersQuery)

        expect(followersRes.status).toBe(200)
        expect(followersRes.body.data.followers.length).toBe(1)
        expect(followersRes.body.data.followers[0].fullName).toBe('User One')

        // 5. Query following of user 1
        const followingQuery = {
            query: `
                query GetFollowing($id: ID!) {
                    following(userId: $id, limit: 10, skip: 0) {
                        fullName
                    }
                }
            `,
            variables: { id: user1.getId().getValue() }
        }

        const followingRes = await request(app.getHttpServer())
            .post(graphqlPath)
            .set('Authorization', `Bearer ${token}`)
            .send(followingQuery)

        expect(followingRes.status).toBe(200)
        expect(followingRes.body.data.following.length).toBe(1)
        expect(followingRes.body.data.following[0].fullName).toBe('User Two')
    })

    it('should query a single user and their profile', async () => {
        const password = await Password.create('Password123!', passwordHasher)
        const user = User.create(UserId.create(randomUUID()), Email.create('single@example.com'), password, 'Client', null, 'Single User', new Date('1990-01-01'))
        await userRepository.save(user)

        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'single@example.com', password: 'Password123!' })
        const token = loginRes.body.tokens.accessToken

        const userQuery = {
            query: `
                query GetUser($id: ID!) {
                    user(id: $id) {
                        id
                        email
                        profile {
                            fullName
                        }
                    }
                }
            `,
            variables: { id: user.getId().getValue() }
        }

        const res = await request(app.getHttpServer())
            .post(graphqlPath)
            .set('Authorization', `Bearer ${token}`)
            .send(userQuery)

        expect(res.status).toBe(200)
        expect(res.body.data.user.email).toBe('single@example.com')
        expect(res.body.data.user.profile.fullName).toBe('Single User')
    })

    it('should list users with pagination', async () => {
        const password = await Password.create('Password123!', passwordHasher)
        const user1 = User.create(UserId.create(randomUUID()), Email.create('list1@example.com'), password, 'Client', null, 'User 1', new Date())
        const user2 = User.create(UserId.create(randomUUID()), Email.create('list2@example.com'), password, 'Client', null, 'User 2', new Date())
        await userRepository.save(user1)
        await userRepository.save(user2)

        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'list1@example.com', password: 'Password123!' })
        const token = loginRes.body.tokens.accessToken

        const usersQuery = {
            query: `
                query GetUsers($limit: Int!, $skip: Int!) {
                    users(limit: $limit, skip: $skip) {
                        email
                    }
                }
            `,
            variables: { limit: 1, skip: 0 }
        }

        const res = await request(app.getHttpServer())
            .post(graphqlPath)
            .set('Authorization', `Bearer ${token}`)
            .send(usersQuery)

        expect(res.status).toBe(200)
        expect(res.body.data.users.length).toBe(1)
    })

    it('should follow a user and verify followersList/followingList resolve fields', async () => {
        const password = await Password.create('Password123!', passwordHasher)
        const user1 = User.create(UserId.create(randomUUID()), Email.create('flow1@example.com'), password, 'Client', null, 'Flow One', new Date())
        const user2 = User.create(UserId.create(randomUUID()), Email.create('flow2@example.com'), password, 'Client', null, 'Flow Two', new Date())
        await userRepository.save(user1)
        await userRepository.save(user2)

        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'flow1@example.com', password: 'Password123!' })
        const token = loginRes.body.tokens.accessToken

        // Follow
        await request(app.getHttpServer())
            .post(graphqlPath)
            .set('Authorization', `Bearer ${token}`)
            .send({
                query: `mutation Follow($id: ID!) { followUser(followingId: $id) { message } }`,
                variables: { id: user2.getId().getValue() }
            })

        // Verify nested lists
        const nestedQuery = {
            query: `
                query GetNested($u1: ID!, $u2: ID!) {
                    user1: user(id: $u1) {
                        followingList(limit: 10, skip: 0) { fullName }
                    }
                    user2: user(id: $u2) {
                        followersList(limit: 10, skip: 0) { fullName }
                    }
                }
            `,
            variables: { u1: user1.getId().getValue(), u2: user2.getId().getValue() }
        }

        const res = await request(app.getHttpServer())
            .post(graphqlPath)
            .set('Authorization', `Bearer ${token}`)
            .send(nestedQuery)

        expect(res.status).toBe(200)
        expect(res.body.data.user1.followingList[0].fullName).toBe('Flow Two')
        expect(res.body.data.user2.followersList[0].fullName).toBe('Flow One')
    })
})
