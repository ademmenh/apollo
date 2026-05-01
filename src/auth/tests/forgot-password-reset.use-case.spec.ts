import { describe, it, expect, beforeEach, jest } from 'bun:test'
import { ForgotPasswordResetUseCase } from '../application/forgot-password-reset'
import { InMemoryUserRepository } from '../../users/infrastructure/in-memory-repository'
import { BcryptPasswordHasher } from 'src/users/infrastructure/bcrypt-password'
import { User } from 'src/users/domain/entity'
import { UserId } from 'src/users/domain/userId'
import { Email } from 'src/users/domain/email'
import { Password } from 'src/users/domain/password'
import { PhoneNumber } from 'src/users/domain/phone-number'
import { OutboxEvent } from 'src/outbox/domain/outbox-event.entity'
import {
    ResetRequestNotFoundError,
    TooManyAttemptsError,
    InvalidCodeError
} from '../domain/error'

describe('ForgotPasswordResetUseCase', () => {
    let useCase: ForgotPasswordResetUseCase
    let userRepository: InMemoryUserRepository
    let passwordHasher: BcryptPasswordHasher

    beforeEach(() => {
        userRepository = new InMemoryUserRepository()
        passwordHasher = new BcryptPasswordHasher()
        useCase = new ForgotPasswordResetUseCase(userRepository, passwordHasher)
    })

    const createDummyEvent = (userId: string) => OutboxEvent.create('event-id', 'PASSWORD_RESET_EMAIL_REQUESTED', {}, userId)

    it('reset password', async () => {
        const userId = 'user-id'
        const user = User.create(
            UserId.create(userId),
            Email.create('test@example.com'),
            await Password.create('oldPassword', passwordHasher),
            'Client',
            PhoneNumber.create('0501234567'),
            'John Doe',
            new Date('1990-01-01'),
        )
        await userRepository.save(user)
        const secret = '123456'
        const secretHash = await passwordHasher.hash(secret)
        await userRepository.saveForgotPasswordSecret(userId, secretHash, secret, 3, createDummyEvent(userId))
        await useCase.execute(userId, secret, 'newPassword123')
        const updatedUser = await userRepository.findById(userId)
        if (!updatedUser) throw new Error('User should not be null')
        const isMatch = await updatedUser.getPassword().compare('newPassword123', passwordHasher)
        expect(isMatch).toBe(true)
    })

    it('secret not found', async () => {
        const promise = useCase.execute('user-id', '123456', 'newPassword123')
        expect(promise).rejects.toThrow(ResetRequestNotFoundError)
    })

    it('invalid secret', async () => {
        const userId = 'user-id'
        const secret = '123456'
        const secretHash = await passwordHasher.hash(secret)
        await userRepository.saveForgotPasswordSecret(userId, secretHash, secret, 3, createDummyEvent(userId))
        const promise = useCase.execute(userId, 'wrongSecret', 'newPassword123')
        expect(promise).rejects.toThrow(InvalidCodeError)
        const secretData = await userRepository.getForgotPasswordSecret(userId)
        if (!secretData) throw new Error('Secret data should not be null')
        expect(secretData.attempts).toBe(2)
    })

    it('attempts exhausted', async () => {
        const userId = 'user-id'
        const secretHash = await passwordHasher.hash('123456')
        await userRepository.saveForgotPasswordSecret(userId, secretHash, '123456', 0, createDummyEvent(userId))
        const promise = useCase.execute(userId, '123456', 'newPassword123')
        expect(promise).rejects.toThrow(TooManyAttemptsError)
        const secretData = await userRepository.getForgotPasswordSecret(userId)
        if (secretData !== null) throw new Error('Secret data should be null')
    })
})
