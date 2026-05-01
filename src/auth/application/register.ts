import { Injectable, Inject } from '@nestjs/common'
import { randomBytes, randomUUID } from 'crypto'
import type { IPasswordHasher } from '../domain/password-hasher'
import type { IUserRepository } from 'src/users/domain/repository'
import { User } from 'src/users/domain/entity'
import { Email } from 'src/users/domain/email'
import { Password } from 'src/users/domain/password'
import { UserId } from 'src/users/domain/userId'
import { PhoneNumber } from 'src/users/domain/phone-number'
import { UserAlreadyExistsError, MissingEmailError } from '../../users/domain/errors'

export interface RegisterUserCommand {
    id: string
    email?: string
    password: string
    phoneNumber?: string
    fullName: string
    birthDate: string
}

@Injectable()
export class RegisterUserUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
        @Inject('IPasswordHasher') private readonly passwordHasher: IPasswordHasher,
    ) { }

    async execute(command: RegisterUserCommand): Promise<User> {
        if (!command.email) throw new MissingEmailError()
        const email = Email.create(command.email)
        const [existingUser, existingNotVerified] = await Promise.all([
            this.userRepository.findByEmail(email.getValue()),
            this.userRepository.getNotVerifiedUserByEmail(email.getValue())
        ])
        if (existingUser || existingNotVerified) throw new UserAlreadyExistsError(email.getValue())
        const password = await Password.create(command.password, this.passwordHasher)
        const userId = UserId.create(command.id)
        const phoneNumber = command.phoneNumber ? PhoneNumber.create(command.phoneNumber) : null
        const user = User.create(userId, email, password, 'Client', phoneNumber, command.fullName, new Date(command.birthDate))
        const code = randomBytes(3).toString('hex').toUpperCase()
        const codeHash = await this.passwordHasher.hash(code)
        const eventPayload = {
            type: 'VERIFICATION_EMAIL_REQUESTED',
            payload: {
                id: randomUUID(),
                to: email.getValue(),
                fullName: user.getFullName(),
                code: code,
                metadata: {
                    aggregateId: user.getId().getValue(),
                    aggregateType: 'User',
                    timestamp: new Date().toISOString()
                }
            }
        }
        await this.userRepository.saveNotVerified(user, codeHash, 3, eventPayload)
        return user
    }
}
