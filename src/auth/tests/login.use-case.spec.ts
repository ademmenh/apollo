import { describe, it, expect, beforeEach, jest } from 'bun:test'
import { LoginUseCase } from '../application/login.use-case'
import { InMemoryUserRepository } from '../../users/infrastructure/persistence/in-memory-user.repository'
import { BcryptPasswordHasher } from '../../users/infrastructure/security/bcrypt-password-hasher'
import { TokenAdapter } from '../infrastructure/adapters/token.adapter'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { User } from '../../users/domain/user.aggregate'
import { UserId } from '../../users/domain/value-objects/user-id.vo'
import { Email } from '../../users/domain/value-objects/email.vo'
import { Password } from '../../users/domain/value-objects/password.vo'
import { PhoneNumber } from '../../users/domain/value-objects/phone-number.vo'

describe('LoginUseCase', () => {
    let useCase: LoginUseCase
    let userRepository: InMemoryUserRepository
    let passwordHasher: BcryptPasswordHasher
    let tokenProvider: TokenAdapter
    let configService: ConfigService
    let jwtService: JwtService

    beforeEach(() => {
        userRepository = new InMemoryUserRepository()
        passwordHasher = new BcryptPasswordHasher()
        configService = new ConfigService()
        jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
            if (key === 'JWT_ACCESS_TOKEN_EXPIRY') return 3600
            if (key === 'JWT_REFRESH_TOKEN_EXPIRY') return 86400
            if (key === 'JWT_ACCESS_TOKEN_SECRET') return 'acc-sec'
            if (key === 'JWT_REFRESH_TOKEN_SECRET') return 'ref-sec'
            throw new Error(`Unexpected config key: ${key}`)
        })
        jwtService = new JwtService()
        tokenProvider = new TokenAdapter(jwtService, configService)

        useCase = new LoginUseCase(userRepository, passwordHasher, tokenProvider)
    })

    const createValidUser = (): User => {
        return User.reconstruct(
            UserId.create('user-123'),
            Email.create('test@example.com'),
            Password.fromHash('hashed-password'),
            'Client',
            PhoneNumber.create('0501234567'),
            'Test User',
            new Date('1990-01-01'),
            false,
            new Date(),
            null
        )
    }

    const createBannedUser = (): User => {
        return User.reconstruct(
            UserId.create('user-123'),
            Email.create('banned@example.com'),
            Password.fromHash('hashed-password'),
            'Client',
            PhoneNumber.create('0501234568'),
            'Banned User',
            new Date('1990-01-01'),
            true, // isBanned
            new Date(),
            null
        )
    }

    it('logIn - successfully', async () => {
        const user = createValidUser()
        jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(user)
        jest.spyOn(passwordHasher, 'compare').mockResolvedValue(true)

        const result = await useCase.execute(
            { email: 'test@example.com', password: 'password123' }
        )

        expect(result.user).toBe(user)
        expect(result.accessToken).toBeDefined()
        expect(result.refreshToken).toBeDefined()
    })

    it('logIn - user does not exist', async () => {
        jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null)

        expect(
            useCase.execute({ email: 'nonexistent@example.com', password: 'password123' })
        ).rejects.toThrow('Invalid credentials')
    })

    it('logIn - password does not match', async () => {
        const user = createValidUser()
        jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(user)
        jest.spyOn(passwordHasher, 'compare').mockResolvedValue(false)

        expect(
            useCase.execute({ email: 'test@example.com', password: 'wrongpassword' })
        ).rejects.toThrow('Invalid credentials')
    })

    it('logIn - user is banned', async () => {
        const bannedUser = createBannedUser()
        jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(bannedUser)
        jest.spyOn(passwordHasher, 'compare').mockResolvedValue(true)

        expect(
            useCase.execute({ email: 'banned@example.com', password: 'password123' })
        ).rejects.toThrow('User user-123 can not login.') // from CanNotLoginError
    })
})
