import { describe, it, expect, beforeEach } from 'bun:test'
import { ForgotPasswordResetUseCase } from '../application/forgot-password-reset.use-case'
import { InMemoryUserRepository } from '../../users/infrastructure/persistence/in-memory-user.repository'
import { BcryptPasswordHasher } from 'src/users/infrastructure/security/bcrypt-password-hasher'
import { User } from 'src/users/domain/user.aggregate'
import { UserId } from 'src/users/domain/value-objects/user-id.vo'
import { Email } from 'src/users/domain/value-objects/email.vo'
import { Password } from 'src/users/domain/value-objects/password.vo'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { PhoneNumber } from 'src/users/domain/value-objects/phone-number.vo'

describe('ForgotPasswordResetUseCase', () => {
    let useCase: ForgotPasswordResetUseCase
    let userRepository: InMemoryUserRepository
    let passwordHasher: BcryptPasswordHasher

    beforeEach(() => {
        userRepository = new InMemoryUserRepository()
        passwordHasher = new BcryptPasswordHasher()
        useCase = new ForgotPasswordResetUseCase(userRepository, passwordHasher)
    })

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
        await userRepository.saveForgotPasswordSecret(userId, secretHash, secret, 3, { type: 'PASSWORD_RESET_EMAIL_REQUESTED', payload: {} })
        await useCase.execute(userId, secret, 'newPassword123')
        const updatedUser = await userRepository.findById(userId)
        if (!updatedUser) throw new Error('User should not be null')
        const isMatch = await updatedUser.getPassword().compare('newPassword123', passwordHasher)
        expect(isMatch).toBe(true)
        // The secret is retained in the DB because we rely on Valkey TTL
    })

    it('secret not found', async () => {
        const promise = useCase.execute('user-id', '123456', 'newPassword123')
        expect(promise).rejects.toThrow(NotFoundException)
    })

    it('invalid secret', async () => {
        const userId = 'user-id'
        const secret = '123456'
        const secretHash = await passwordHasher.hash(secret)
        await userRepository.saveForgotPasswordSecret(userId, secretHash, secret, 3, { type: 'PASSWORD_RESET_EMAIL_REQUESTED', payload: {} })
        const promise = useCase.execute(userId, 'wrongSecret', 'newPassword123')
        expect(promise).rejects.toThrow(BadRequestException)
        const secretData = await userRepository.getForgotPasswordSecret(userId)
        if (!secretData) throw new Error('Secret data should not be null')
        expect(secretData.attempts).toBe(2)
    })

    it('attempts exhausted', async () => {
        const userId = 'user-id'
        const secretHash = await passwordHasher.hash('123456')
        await userRepository.saveForgotPasswordSecret(userId, secretHash, '123456', 0, { type: 'PASSWORD_RESET_EMAIL_REQUESTED', payload: {} })
        const promise = useCase.execute(userId, '123456', 'newPassword123')
        expect(promise).rejects.toThrow(BadRequestException)
        const secretData = await userRepository.getForgotPasswordSecret(userId)
        if (secretData !== null) throw new Error('Secret data should not be null')
    })
})
