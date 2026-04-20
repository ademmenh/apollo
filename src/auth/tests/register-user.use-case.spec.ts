import { describe, it, expect, beforeEach, jest } from 'bun:test'
import { RegisterUserCommand, RegisterUserUseCase } from '../application/register-user'
import { InMemoryUserRepository } from 'src/users/infrastructure/in-memory-repository'
import { BcryptPasswordHasher } from 'src/users/infrastructure/bcrypt-password'
import { MissingEmailError } from 'src/users/domain/errors'

describe('RegisterUserUseCase', () => {
    let useCase: RegisterUserUseCase
    let userRepository: InMemoryUserRepository
    let passwordHasher: BcryptPasswordHasher

    beforeEach(() => {
        userRepository = new InMemoryUserRepository()
        passwordHasher = new BcryptPasswordHasher()
        useCase = new RegisterUserUseCase(userRepository, passwordHasher)
    })

    it('register user', async () => {
        const command: RegisterUserCommand = {
            id: '123e4567-e89b-12d3-a456-426614174001',
            email: 'client@example.com',
            password: 'password123',
            phoneNumber: '0550123456',
            fullName: 'John Doe',
            birthDate: '1990-01-01',
        }
        const spy = jest.spyOn(userRepository, 'saveNotVerified')
        await useCase.execute(command)
        const unverified = await userRepository.getNotVerifiedUser(command.id)
        if (unverified === null) throw new Error('User not found')
        expect(unverified.user.getRole()).toBe('Client')
        expect(spy).toHaveBeenCalled()
    })

    it('register user without email', async () => {
        const command: RegisterUserCommand = {
            id: '123e4567-e89b-12d3-a456-426614174003',
            password: 'password123',
            phoneNumber: '0550123456',
            fullName: 'No Email User',
            birthDate: '1990-01-01',
        } as RegisterUserCommand

        await expect(useCase.execute(command)).rejects.toThrow(MissingEmailError)
    })

    it('registration fails with missing phone number', async () => {
        const command: RegisterUserCommand = {
            id: '123e4567-e89b-12d3-a456-426614174005',
            email: 'test@example.com',
            password: 'password123',
            fullName: 'John Doe',
            birthDate: '1990-01-01',
        } as RegisterUserCommand
        await expect(useCase.execute(command)).rejects.toThrow()
    })
})
