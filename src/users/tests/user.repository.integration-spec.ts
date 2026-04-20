import { describe, it, expect, beforeAll, afterEach, jest } from 'bun:test'
import { Test, TestingModule } from '@nestjs/testing'
import { UserRepository } from '../infrastructure/repository'
import { DrizzleModule } from '../../config/infrastructure/drizzle-module'
import { ValkeyModule } from '../../config/infrastructure/valkey-module'
import { ConfigModule } from '../../config/module'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { usersTable, profilesTable } from '../infrastructure/schema'
import { User } from '../domain/entity'
import { UserId } from '../domain/userId'
import { Email } from '../domain/email'
import { Password } from '../domain/password'
import { PhoneNumber } from '../domain/phone-number'
import { sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { IPasswordHasher } from '../../auth/domain/password-hasher'
import { LoggerStore } from '../../config/infrastructure/loggers'
import { Logger } from '../../common/infrastructure/logger'
import * as winston from 'winston'

describe('UserRepository (Integration)', () => {
    let repository: UserRepository
    let db: NodePgDatabase
    const mockHasher: IPasswordHasher = {
        hash: jest.fn().mockResolvedValue('hashed_password'),
        compare: jest.fn().mockResolvedValue(true),
    }

    beforeAll(async () => {
        const dummyLogger = new Logger([new winston.transports.Console({ silent: true })])
        LoggerStore.app = dummyLogger
        LoggerStore.worker = dummyLogger
        const module: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule, DrizzleModule, ValkeyModule],
            providers: [UserRepository],
        }).compile()
        repository = module.get<UserRepository>(UserRepository)
        db = module.get<NodePgDatabase>('DRIZZLE_CLIENT')
    })

    afterEach(async () => {
        await db.execute(sql`DELETE FROM ${profilesTable}`)
        await db.execute(sql`DELETE FROM ${usersTable}`)
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
        if (foundUser !== null) throw new Error('User should not be null')
    })

    it('user not found by email', async () => {
        const foundUser = await repository.findByEmail('nonexistent@example.com')
        if (foundUser !== null) throw new Error('User should not be null')
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
        const eventPayload = { type: 'VERIFICATION_EMAIL_REQUESTED', payload: { to: 'test@example.com', fullName: 'Test', code: '123' } }
        await repository.saveNotVerified(user, codeHash, attempts, eventPayload)
        const cached = await repository.getNotVerifiedUser(userId.getValue())
        if (!cached) throw new Error('Cached user should not be null')
        expect(cached.user.getId().getValue()).toBe(userId.getValue())
        expect(cached.codeHash).toBe(codeHash)
        expect(cached.attempts).toBe(attempts)
        const dbUser = await repository.findById(userId.getValue())
        if (dbUser !== null) throw new Error('User should not be null')
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
        const eventPayload = { type: 'VERIFICATION_EMAIL_REQUESTED', payload: { to: 'test@example.com', fullName: 'Test', code: '123' } }
        await repository.saveNotVerified(user, 'hash', 3, eventPayload)
        await repository.removeNotVerifiedUser(userId.getValue())
        const cached = await repository.getNotVerifiedUser(userId.getValue())
        if (cached !== null) throw new Error('User should not be null')
    })
})
