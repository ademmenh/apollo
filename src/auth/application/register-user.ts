import { Injectable, Inject } from '@nestjs/common'
import { randomBytes } from 'crypto'
import type { IPasswordHasher } from '../domain/password-hasher'
import type { IUserRepository } from 'src/users/domain/repository'
import { User } from 'src/users/domain/entity'
import { Email } from 'src/users/domain/email'
import { Password } from 'src/users/domain/password'
import { UserId } from 'src/users/domain/userId'
import { PhoneNumber } from 'src/users/domain/phone-number'
import { UserAlreadyExistsError, MissingPhoneNumberError, PhoneAlreadyExistsError, MissingEmailError } from '../../users/domain/errors'


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
        const existingUser = await this.userRepository.findByEmail(email.getValue())
        if (existingUser) throw new UserAlreadyExistsError(email.getValue())
        const password = await Password.create(command.password, this.passwordHasher)
        if (!command.phoneNumber) throw new MissingPhoneNumberError()
        const phoneNumber = PhoneNumber.create(command.phoneNumber)
        const existingVerifiedUserWithPhone = await this.userRepository.findByPhone(phoneNumber.getValue())
        if (existingVerifiedUserWithPhone) throw new PhoneAlreadyExistsError(phoneNumber.getValue())
        const existingNotVerifiedUserWithPhone = await this.userRepository.getNotVerifiedUserByPhone(phoneNumber.getValue())
        if (existingNotVerifiedUserWithPhone) throw new PhoneAlreadyExistsError(phoneNumber.getValue())
        const userId = UserId.create(command.id)
        const user = User.create(userId, email, password, 'Client', phoneNumber, command.fullName, new Date(command.birthDate))
        const code = randomBytes(3).toString('hex').toUpperCase()
        const codeHash = await this.passwordHasher.hash(code)
        const eventPayload = {
            type: 'VERIFICATION_EMAIL_REQUESTED',
            payload: {
                to: email.getValue(),
                fullName: user.getFullName(),
                code: code
            }
        }
        await this.userRepository.saveNotVerified(user, codeHash, 3, eventPayload)
        return user
    }
}
