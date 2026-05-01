import { describe, it, expect, beforeEach, jest } from 'bun:test'
import { RegisterUserCommand, RegisterUserUseCase } from '../application/register'
import { InMemoryUserRepository } from 'src/users/infrastructure/in-memory-repository'
import { BcryptPasswordHasher } from 'src/users/infrastructure/bcrypt-password'
import { MissingEmailError } from 'src/users/domain/errors'
import { IDGenerator } from 'src/common/domain/id-generator'

describe('RegisterUserUseCase', () => {
    let useCase: RegisterUserUseCase
    let userRepository: InMemoryUserRepository
    let passwordHasher: BcryptPasswordHasher
    let idGenerator: IDGenerator

    beforeEach(() => {
        userRepository = new InMemoryUserRepository()
        passwordHasher = new BcryptPasswordHasher()
        idGenerator = {
            newId: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174001')
        }
        useCase = new RegisterUserUseCase(userRepository, passwordHasher, idGenerator)
    })

    it('register user', async () => {
        const command: RegisterUserCommand = {
            email: 'client@example.com',
            password: 'password123',
            phoneNumber: '0550123456',
            fullName: 'John Doe',
            birthDate: '1990-01-01',
        }
        const spy = jest.spyOn(userRepository, 'saveNotVerified')
        await useCase.execute(command)
        const unverified = await userRepository.getNotVerified('123e4567-e89b-12d3-a456-426614174001')
        if (unverified === null) throw new Error('User not found')
        expect(unverified.user.getRole()).toBe('Client')
        expect(spy).toHaveBeenCalled()
    })

    it('register user without email', async () => {
        const command: RegisterUserCommand = {
            password: 'password123',
            phoneNumber: '0550123456',
            fullName: 'No Email User',
            birthDate: '1990-01-01',
        } as RegisterUserCommand

        await expect(useCase.execute(command)).rejects.toThrow(MissingEmailError)
    })

    it('registration succeeds with missing phone number', async () => {
        const command: RegisterUserCommand = {
            email: 'test-no-phone@example.com',
            password: 'password123',
            fullName: 'John Doe',
            birthDate: '1990-01-01',
        } as RegisterUserCommand
        await useCase.execute(command)
        const unverified = await userRepository.getNotVerified('123e4567-e89b-12d3-a456-426614174001')
        if (unverified === null) throw new Error('User not found')
        expect(unverified.user.getPhoneNumber()).toBeNull()
    })
})
