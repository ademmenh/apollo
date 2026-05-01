import { describe, it, expect, beforeEach, jest } from 'bun:test'
import { RequestForgotPasswordUseCase } from '../application/request-forgot-password'
import { InMemoryUserRepository } from 'src/users/infrastructure/in-memory-repository'
import { BcryptPasswordHasher } from 'src/users/infrastructure/bcrypt-password'
import { User } from 'src/users/domain/entity'
import { UserId } from 'src/users/domain/userId'
import { Email } from 'src/users/domain/email'
import { PhoneNumber } from 'src/users/domain/phone-number'
import { Password } from 'src/users/domain/password'
import { IDGenerator } from 'src/common/domain/id-generator'
import { UserNotFoundError } from '../domain/error'

describe('RequestForgotPasswordUseCase', () => {
    let useCase: RequestForgotPasswordUseCase
    let userRepository: InMemoryUserRepository
    let passwordHasher: BcryptPasswordHasher
    let idGenerator: IDGenerator

    beforeEach(() => {
        userRepository = new InMemoryUserRepository()
        passwordHasher = new BcryptPasswordHasher()
        idGenerator = {
            newId: jest.fn().mockReturnValue('event-id')
        }
        useCase = new RequestForgotPasswordUseCase(userRepository, passwordHasher, idGenerator)
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
        const event = args[4]
        expect(event).toBeDefined()
        expect(event.type).toBe('PASSWORD_RESET_EMAIL_REQUESTED')
        expect(event.payload.fullName).toBe('John Doe')
    })

    it('user not found', async () => {
        await expect(useCase.execute('nonexistent@example.com')).rejects.toThrow(UserNotFoundError)
    })
})
