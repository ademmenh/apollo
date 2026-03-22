import { describe, it, expect, beforeEach, jest } from 'bun:test'
import { RequestForgotPasswordUseCase } from '../application/request-forgot-password.use-case'
import { InMemoryUserRepository } from '../../users/infrastructure/persistence/in-memory-user.repository'
import { BcryptPasswordHasher } from 'src/users/infrastructure/security/bcrypt-password-hasher'
import { User } from '../../users/domain/user.aggregate'
import { UserId } from '../../users/domain/value-objects/user-id.vo'
import { Email } from '../../users/domain/value-objects/email.vo'
import { PhoneNumber } from '../../users/domain/value-objects/phone-number.vo'
import { Password } from '../../users/domain/value-objects/password.vo'

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
