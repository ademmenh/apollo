import { describe, it, expect, beforeEach } from 'bun:test'
import { ChangePasswordUseCase } from '../application/change-password.use-case'
import { InMemoryUserRepository } from '../../users/infrastructure/persistence/in-memory-user.repository'
import { BcryptPasswordHasher } from 'src/users/infrastructure/security/bcrypt-password-hasher'
import { User } from 'src/users/domain/user.aggregate'
import { UserId } from 'src/users/domain/value-objects/user-id.vo'
import { Email } from 'src/users/domain/value-objects/email.vo'
import { Password } from 'src/users/domain/value-objects/password.vo'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { PhoneNumber } from 'src/users/domain/value-objects/phone-number.vo'

describe('ChangePasswordUseCase', () => {
    let useCase: ChangePasswordUseCase
    let userRepository: InMemoryUserRepository
    let passwordHasher: BcryptPasswordHasher

    beforeEach(() => {
        userRepository = new InMemoryUserRepository()
        passwordHasher = new BcryptPasswordHasher()
        useCase = new ChangePasswordUseCase(userRepository, passwordHasher)
    })

    it('change password', async () => {
        const userId = 'user-id'
        const user = User.create(
            UserId.create(userId),
            Email.create('test@example.com'),
            await Password.create('oldPassword123', passwordHasher),
            'Client',
            PhoneNumber.create('0501234567'),
            'John Doe',
            new Date('1990-01-01'),
        )
        await userRepository.save(user)
        await useCase.execute(userId, 'oldPassword123', 'newPassword123')
        const updatedUser = await userRepository.findById(userId)
        if (!updatedUser) throw new Error('User should not be null')
        const isMatch = await updatedUser.getPassword().compare('newPassword123', passwordHasher)
        expect(isMatch).toBe(true)
    })

    it('invalid old password', async () => {
        const userId = 'user-id'
        const user = User.create(
            UserId.create(userId),
            Email.create('test@example.com'),
            await Password.create('oldPassword123', passwordHasher),
            'Client',
            PhoneNumber.create('0501234567'),
            'John Doe',
            new Date('1990-01-01'),
        )
        await userRepository.save(user)
        const promise = useCase.execute(userId, 'wrongPassword', 'newPassword123')
        expect(promise).rejects.toThrow(BadRequestException)
    })

    it('user not found', async () => {
        const promise = useCase.execute('nonexistent', 'old', 'new')
        expect(promise).rejects.toThrow(NotFoundException)
    })
})
