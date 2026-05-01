import { describe, it, expect, beforeAll, afterEach, jest } from 'bun:test'
import { Test, TestingModule } from '@nestjs/testing'
import { UserRepository } from '../infrastructure/repository'
import { DrizzleModule } from '../../config/infrastructure/drizzle-module'
import { ValkeyModule } from '../../config/infrastructure/valkey-module'
import { ConfigModule } from '../../config/module'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { usersTable, profilesTable, followsTable } from '../infrastructure/schema'
import { postsTable } from '../../posts/infrastructure/schema'
import { User } from '../domain/entity'
import { UserId } from '../domain/userId'
import { Email } from '../domain/email'
import { Password } from '../domain/password'
import { PhoneNumber } from '../domain/phone-number'
import { sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { IPasswordHasher } from '../../auth/domain/password-hasher'
import { Logger } from '../../common/infrastructure/logger'
import * as winston from 'winston'
import { OutboxEvent } from '../../outbox/domain/outbox-event.entity'

describe('UserRepository (Integration)', () => {
    let repository: UserRepository
    let db: NodePgDatabase
    const mockHasher: IPasswordHasher = {
        hash: jest.fn().mockResolvedValue('hashed_password'),
        compare: jest.fn().mockResolvedValue(true),
    }

    beforeAll(async () => {
        const dummyLogger = new Logger([new winston.transports.Console({ silent: true })])
        const module: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule, DrizzleModule, ValkeyModule],
            providers: [
                UserRepository,
                { provide: 'APP_LOGGER', useValue: dummyLogger },
                { provide: 'WORKER_LOGGER', useValue: dummyLogger },
            ],
        }).compile()
        repository = module.get<UserRepository>(UserRepository)
        db = module.get<NodePgDatabase>('DRIZZLE_CLIENT')
    })

    afterEach(async () => {
        await db.execute(sql`TRUNCATE TABLE ${postsTable}, ${followsTable}, ${profilesTable}, ${usersTable} RESTART IDENTITY CASCADE`)
    })

    it('save and find by ID', async () => {
        const userId = UserId.create(randomUUID())
        const user = User.create(
            userId,
            Email.create('test@example.com'),
            await Password.create('Password123!', mockHasher),
            'Client',
            PhoneNumber.create('0550123456'),
            'John Doe',
            new Date('1990-01-01'),
        )
        await repository.save(user)
        const foundUser = await repository.findById(userId.getValue())
        if (!foundUser) throw new Error('Found user should not be null')
        expect(foundUser.getId().getValue()).toBe(userId.getValue())
        const email = foundUser.getEmail()
        if (!email) throw new Error('Email should not be null')
        expect(email.getValue()).toBe('test@example.com')
        expect(foundUser.getFullName()).toBe('John Doe')
        expect(foundUser.getBirthDate().toISOString()).toBe(new Date('1990-01-01').toISOString())
        expect(foundUser.getRole()).toBe('Client')
    })

    it('find by email', async () => {
        const userId = UserId.create(randomUUID())
        const email = 'unique@example.com'
        const user = User.create(userId, Email.create(email), await Password.create('Password123!', mockHasher), 'Driver', PhoneNumber.create('0660123456'), 'Jane Smith', new Date('1992-05-01'))
        await repository.save(user)
        const foundUser = await repository.findByEmail(email)
        if (!foundUser) throw new Error('Found user should not be null')
        expect(foundUser.getId().getValue()).toBe(userId.getValue())
        const emailResult = foundUser.getEmail()
        if (!emailResult) throw new Error('Email result should not be null')
        expect(emailResult.getValue()).toBe(email)
    })

    it('user not found by ID', async () => {
        const foundUser = await repository.findById(randomUUID())
        if (foundUser !== null) throw new Error('User should not be found')
    })

    it('user not found by email', async () => {
        const foundUser = await repository.findByEmail('nonexistent@example.com')
        if (foundUser !== null) throw new Error('User should not be found')
    })

    it('update existing user', async () => {
        const userId = UserId.create(randomUUID())
        const user = User.create(
            userId,
            Email.create('update@example.com'),
            await Password.create('InitialPass123!', mockHasher),
            'Client',
            PhoneNumber.create('0550123456'),
            'Original Name',
            new Date('1980-01-01'),
        )
        await repository.save(user)
        user.ban()
        await repository.update(user)
        const foundUser = await repository.findById(userId.getValue())
        if (!foundUser) throw new Error('Found user should not be null')
        expect(foundUser.isUserBanned()).toBe(true)
    })

    it('save and retrieve not verified user', async () => {
        const userId = UserId.create(randomUUID())
        const user = User.create(
            userId,
            Email.create('pending@example.com'),
            await Password.create('Password123!', mockHasher),
            'Client',
            PhoneNumber.create('0550123456'),
            'Pending User',
            new Date('1995-01-01'),
        )
        const codeHash = 'hash123'
        const attempts = 3
        const event = OutboxEvent.create(randomUUID(), 'VERIFICATION_EMAIL_REQUESTED', { fullName: 'Test', code: '123' }, userId.getValue())
        await repository.saveNotVerified(user, codeHash, attempts, event)
        const cached = await repository.getNotVerified(userId.getValue())
        if (!cached) throw new Error('Cached user should not be null')
        expect(cached.user.getId().getValue()).toBe(userId.getValue())
        expect(cached.codeHash).toBe(codeHash)
        expect(cached.attempts).toBe(attempts)
        const dbUser = await repository.findById(userId.getValue())
        if (dbUser !== null) throw new Error('User should be in Valkey, not DB yet')
    })

    it('remove not verified user', async () => {
        const userId = UserId.create(randomUUID())
        const user = User.create(
            userId,
            Email.create('toremove@example.com'),
            await Password.create('Password123!', mockHasher),
            'Client',
            PhoneNumber.create('0550123456'),
            'To Remove',
            new Date('1999-12-31'),
        )
        const event = OutboxEvent.create(randomUUID(), 'VERIFICATION_EMAIL_REQUESTED', { fullName: 'Test', code: '123' }, userId.getValue())
        await repository.saveNotVerified(user, 'hash', 3, event)
        await repository.removeNotVerified(userId.getValue())
        const cached = await repository.getNotVerified(userId.getValue())
        if (cached !== null) throw new Error('User should have been removed from Valkey')
    })

    it('should follow a user', async () => {
        const user1Id = UserId.create(randomUUID())
        const user2Id = UserId.create(randomUUID())
        const user1 = User.create(user1Id, Email.create('user1@example.com'), await Password.create('Password123!', mockHasher), 'Client', null, 'User One', new Date())
        const user2 = User.create(user2Id, Email.create('user2@example.com'), await Password.create('Password123!', mockHasher), 'Client', null, 'User Two', new Date())
        await repository.save(user1)
        await repository.save(user2)

        await repository.follow(user1Id.getValue(), user2Id.getValue())

        const followers = await repository.findFollowers(user2Id.getValue(), 10, 0)
        expect(followers.length).toBe(1)
        expect(followers[0].getId()).toBe(user1Id.getValue())
    })

    it('should find followers', async () => {
        const user1Id = UserId.create(randomUUID())
        const user2Id = UserId.create(randomUUID())
        const user1 = User.create(user1Id, Email.create('user1@example.com'), await Password.create('Password123!', mockHasher), 'Client', null, 'User One', new Date())
        const user2 = User.create(user2Id, Email.create('user2@example.com'), await Password.create('Password123!', mockHasher), 'Client', null, 'User Two', new Date())
        await repository.save(user1)
        await repository.save(user2)

        await repository.follow(user1Id.getValue(), user2Id.getValue())

        const followers = await repository.findFollowers(user2Id.getValue(), 10, 0)
        expect(followers.length).toBe(1)
        expect(followers[0].getId()).toBe(user1Id.getValue())
    })

    it('should find following with pagination', async () => {
        const user1Id = UserId.create(randomUUID())
        const user2Id = UserId.create(randomUUID())
        const user1 = User.create(user1Id, Email.create('user1@example.com'), await Password.create('Password123!', mockHasher), 'Client', null, 'User One', new Date())
        const user2 = User.create(user2Id, Email.create('user2@example.com'), await Password.create('Password123!', mockHasher), 'Client', null, 'User Two', new Date())
        await repository.save(user1)
        await repository.save(user2)

        await repository.follow(user1Id.getValue(), user2Id.getValue())

        const following = await repository.findFollowing(user1Id.getValue(), 10, 0)
        expect(following.length).toBe(1)
        expect(following[0].getId()).toBe(user2Id.getValue())

        // Test pagination
        const followingPaginated = await repository.findFollowing(user1Id.getValue(), 10, 1)
        expect(followingPaginated.length).toBe(0)
    })
})
