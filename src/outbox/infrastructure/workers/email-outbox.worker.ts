import { Inject, Injectable } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { Logger } from 'src/common/infrastructure/logger'
import { SendVerificationEmailUseCase } from 'src/auth/application/send-verification-email'
import { SendPasswordResetUseCase } from 'src/auth/application/send-password-reset'
import { OUTBOX_REPOSITORY, type IOutboxRepository } from '../../domain/interfaces/outbox-repository.interface'
import type { IUserRepository } from 'src/users/domain/repository'
import {
    VerificationEmailPayloadSchema,
    PasswordResetEmailPayloadSchema,
    validatePayload
} from '../validators/payload.validator'

@Injectable()
export class EmailOutboxWorker {
    private isRunning = false

    constructor(
        @Inject(OUTBOX_REPOSITORY) private readonly outboxRepository: IOutboxRepository,
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
        @Inject('APP_LOGGER') private readonly logger: Logger,
        private readonly sendVerificationEmailUseCase: SendVerificationEmailUseCase,
        private readonly sendPasswordResetUseCase: SendPasswordResetUseCase,
    ) { }

    @Interval(5000)
    async handleEmailEvents(): Promise<void> {
        if (this.isRunning) return
        this.isRunning = true

        try {
            const pendingEvents = await this.outboxRepository.getUnprocessedEvents(20)

            if (pendingEvents.length === 0) return

            for (const event of pendingEvents) {
                try {
                    const user = await this.userRepository.findById(event.receiverId)
                    if (!user) {
                        this.logger.error(`[EmailOutboxWorker] User ${event.receiverId} not found for event ${event.id}`)
                        await this.outboxRepository.markEventAsProcessed(event.id)
                        continue
                    }

                    const email = user.getEmail()?.getValue()
                    if (!email) {
                        this.logger.error(`[EmailOutboxWorker] User ${event.receiverId} has no email for event ${event.id}`)
                        await this.outboxRepository.markEventAsProcessed(event.id)
                        continue
                    }

                    if (event.type === 'VERIFICATION_EMAIL_REQUESTED') {
                        const validated = validatePayload(VerificationEmailPayloadSchema, event.payload)
                        await this.sendVerificationEmailUseCase.execute({
                            to: email,
                            fullName: validated.fullName,
                            code: validated.code
                        })
                    } else if (event.type === 'PASSWORD_RESET_EMAIL_REQUESTED') {
                        const validated = validatePayload(PasswordResetEmailPayloadSchema, event.payload)
                        await this.sendPasswordResetUseCase.execute({
                            to: email,
                            fullName: validated.fullName,
                            code: validated.code
                        })
                    }
                    await this.outboxRepository.markEventAsProcessed(event.id)
                } catch (e: unknown) {
                    const err = e instanceof Error ? e.message : String(e)
                    this.logger.error(`[EmailOutboxWorker] Failed to process event ${event.id}: ${err}`)
                }
            }
        } catch (e: unknown) {
            const err = e instanceof Error ? e.message : String(e)
            this.logger.error(`[EmailOutboxWorker] Error during processing cycle: ${err}`)
        } finally {
            this.isRunning = false
        }
    }
}
