import { Injectable, Inject } from '@nestjs/common'
import { randomBytes } from 'crypto'
import type { IPasswordHasher } from '../domain/password-hasher'
import type { IUserRepository } from 'src/users/domain/repository'
import { User } from 'src/users/domain/entity'
import { Email } from 'src/users/domain/email'
import { Password } from 'src/users/domain/password'
import { UserId } from 'src/users/domain/userId'
import { PhoneNumber } from 'src/users/domain/phone-number'
import { UserAlreadyExistsError, MissingEmailError } from '../../users/domain/errors'
import type { IDGenerator } from 'src/common/domain/id-generator'
import { OutboxEvent } from 'src/outbox/domain/outbox-event.entity'

export interface RegisterUserCommand {
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
        @Inject('IDGenerator') private readonly idGenerator: IDGenerator,
    ) { }

    async execute(command: RegisterUserCommand): Promise<User> {
        if (!command.email) throw new MissingEmailError()
        const email = Email.create(command.email)
        const [existingUser, existingNotVerified] = await Promise.all([
            this.userRepository.findByEmail(email.getValue()),
            this.userRepository.getNotVerifiedByEmail(email.getValue())
        ])
        if (existingUser || existingNotVerified) throw new UserAlreadyExistsError(email.getValue())
        const password = await Password.create(command.password, this.passwordHasher)
        const userId = UserId.create(this.idGenerator.newId())
        const phoneNumber = command.phoneNumber ? PhoneNumber.create(command.phoneNumber) : null
        const user = User.create(userId, email, password, 'Client', phoneNumber, command.fullName, new Date(command.birthDate))
        const code = randomBytes(3).toString('hex').toUpperCase()
        const codeHash = await this.passwordHasher.hash(code)
        const event = OutboxEvent.create(
            this.idGenerator.newId(),
            'VERIFICATION_EMAIL_REQUESTED',
            {
                fullName: user.getFullName(),
                code: code,
            },
            user.getId().getValue()
        )
        await this.userRepository.saveNotVerified(user, codeHash, 3, event)
        return user
    }
}
