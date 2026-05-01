import { Inject, Injectable } from '@nestjs/common'
import type { IUserRepository } from '../../users/domain/repository'
import type { IPasswordHasher } from '../domain/password-hasher'
import { randomBytes } from 'crypto'
import { UserNotFoundError } from '../domain/error'
import { OutboxEvent } from 'src/outbox/domain/outbox-event.entity'
import type { IDGenerator } from 'src/common/domain/id-generator'

@Injectable()
export class RequestForgotPasswordUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
        @Inject('IPasswordHasher') private readonly passwordHasher: IPasswordHasher,
        @Inject('IDGenerator') private readonly idGenerator: IDGenerator,
    ) { }

    async execute(emailStr: string): Promise<void> {
        const user = await this.userRepository.findByEmail(emailStr)
        if (!user) throw new UserNotFoundError()

        const code = randomBytes(4).toString('hex').toUpperCase().slice(0, 7)
        const codeHash = await this.passwordHasher.hash(code)

        const event = OutboxEvent.create(
            this.idGenerator.newId(),
            'PASSWORD_RESET_EMAIL_REQUESTED',
            {
                fullName: user.getFullName(),
                code: code
            },
            user.getId().getValue()
        )

        await this.userRepository.saveForgotPasswordSecret(user.getId().getValue(), codeHash, code, 3, event)
    }
}
