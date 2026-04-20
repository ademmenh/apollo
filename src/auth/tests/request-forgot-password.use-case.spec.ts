import { describe, it, expect, beforeEach, jest } from 'bun:test'
import { RequestForgotPasswordUseCase } from '../application/request-forgot-password'
import { InMemoryUserRepository } from 'src/users/infrastructure/in-memory-repository'
import { BcryptPasswordHasher } from 'src/users/infrastructure/bcrypt-password'
import { User } from 'src/users/domain/entity'
import { UserId } from 'src/users/domain/userId'
import { Email } from 'src/users/domain/email'
import { PhoneNumber } from 'src/users/domain/phone-number'
import { Password } from 'src/users/domain/password'

describe('RequestForgotPasswordUseCase', () => {
    let useCase: RequestForgotPasswordUseCase
    let userRepository: InMemoryUserRepository
    let passwordHasher: BcryptPasswordHasher

    beforeEach(() => {
        userRepository = new InMemoryUserRepository()
        passwordHasher = new BcryptPasswordHasher()
        useCase = new RequestForgotPasswordUseCase(userRepository, passwordHasher)
    })

    it('request forgot password successfully', async () => {
        const userId = UserId.create('123e4567-e89b-12d3-a456-426614174001')
        const email = Email.create('test@example.com')
        const phone = PhoneNumber.create('0550111222')
        const password = await Password.create('Password123!', passwordHasher)
        const user = User.create(userId, email, password, 'Client', phone, 'John Doe', new Date())
        await userRepository.save(user)

        const spy = jest.spyOn(userRepository, 'saveForgotPasswordSecret')

        await useCase.execute('test@example.com')

        expect(spy).toHaveBeenCalled()
        const args = spy.mock.calls[0]
        expect(args[4]).toBeDefined()
        expect(args[4]!.type).toBe('PASSWORD_RESET_EMAIL_REQUESTED')
        expect(args[4]!.payload.to).toBe('test@example.com')
    })

    it('user not found', async () => {
        await expect(useCase.execute('nonexistent@example.com')).rejects.toThrow('User not found')
    })
})
