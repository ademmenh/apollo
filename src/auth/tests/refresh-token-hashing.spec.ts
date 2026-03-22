import { describe, it, expect, beforeEach, jest } from 'bun:test'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { LoginUseCase } from '../application/login.use-case'
import { InMemorySessionRepository } from '../infrastructure/persistence/in-memory-session.repository'
import { User } from '../../users/domain/user.aggregate'
import { UserId } from '../../users/domain/value-objects/user-id.vo'
import { Email } from '../../users/domain/value-objects/email.vo'
import { Password } from '../../users/domain/value-objects/password.vo'
import { PhoneNumber } from '../../users/domain/value-objects/phone-number.vo'
import { LoginCommand } from '../application/login.use-case'
import { InMemoryUserRepository } from '../../users/infrastructure/persistence/in-memory-user.repository'
import { BcryptPasswordHasher } from '../../users/infrastructure/security/bcrypt-password-hasher'
import { TokenAdapter } from '../infrastructure/adapters/token.adapter'
import { JwtService } from '@nestjs/jwt'

describe('Refresh Token Hashing Security', () => {
    let loginUseCase: LoginUseCase
    let sessionRepository: InMemorySessionRepository
    let userRepository: InMemoryUserRepository
    let passwordHasher: BcryptPasswordHasher
    let tokenProvider: TokenAdapter
    let configService: ConfigService

    const testUser = User.reconstruct(
        UserId.create('user-123'),
        Email.create('test@example.com'),
        Password.fromHash('hashed-password'),
        'Client',
        PhoneNumber.create('0501234567'),
        'Test User',
        new Date('1990-01-01'),
        false,
        new Date(),
        null,
    )

    beforeEach(async () => {
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
        const jwtService = new JwtService()
        tokenProvider = new TokenAdapter(jwtService, configService)
        sessionRepository = new InMemorySessionRepository()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LoginUseCase,
                { provide: 'IUserRepository', useValue: userRepository },
                { provide: 'IPasswordHasher', useValue: passwordHasher },
                { provide: 'ITokenProvider', useValue: tokenProvider },
                { provide: 'ISessionRepository', useValue: sessionRepository },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile()

        loginUseCase = module.get<LoginUseCase>(LoginUseCase)
    })

    it('store hashed refresh token', async () => {
        const hashedRefreshToken = 'hashed-refresh-token-123'

        const loginDto: LoginCommand = {
            email: 'test@example.com',
            password: 'password123',
        }

        jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(testUser)
        jest.spyOn(passwordHasher, 'compare').mockResolvedValue(true)
        jest.spyOn(passwordHasher, 'hash').mockResolvedValue(hashedRefreshToken)

        const result = await loginUseCase.execute(loginDto, '127.0.0.1', 'test-agent')
        const plainRefreshToken = result.refreshToken
        const sessionWithPlainHash = await sessionRepository.findByHash(plainRefreshToken)
        if (sessionWithPlainHash !== null) throw new Error('Session should not be null')
        const sessionWithHashedHash = await sessionRepository.findByHash(hashedRefreshToken)
        if (!sessionWithHashedHash) throw new Error('Session should not be null')
        expect(sessionWithHashedHash.hashedRefreshToken).toBe(hashedRefreshToken)
        expect(passwordHasher.hash).toHaveBeenCalledWith(plainRefreshToken)
    })
})
