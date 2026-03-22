import { Inject, Injectable } from '@nestjs/common'
import { type IOutboxRepository } from '../domain/outbox-repository.interface'
import { Session } from '../domain/session.entity'
import { type ISessionRepository } from '../domain/session-repository.interface'
import type { IEmailPort } from '../domain/email.port'
import { LoggerStore } from '../../config/infrastructure/loggers'
import type { Logger } from 'winston'

@Injectable()
export abstract class BaseAuthOutboxWorker {
    protected logger: Logger

    constructor(
        @Inject('IOutboxRepository') protected readonly outboxRepository: IOutboxRepository,
        @Inject('ISessionRepository') protected readonly sessionRepository: ISessionRepository,
        @Inject('IEmailAdapter') protected readonly emailAdapter: IEmailPort,
    ) {
        this.logger = LoggerStore.getWorker().getLogger()
    }

    protected async processEvent(event: any): Promise<void> {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload
        switch (event.type) {
            case 'SESSION_CREATED': {
                const session = new Session(payload.userId, payload.hashedRefreshToken, payload.userAgent, payload.ipAddress, payload.role)
                await this.sessionRepository.save(session)
                break
            }
            case 'VERIFICATION_EMAIL_REQUESTED': {
                await this.emailAdapter.sendVerificationEmail(payload.to, payload.fullName, payload.code)
                break
            }
            case 'PASSWORD_RESET_EMAIL_REQUESTED': {
                await this.emailAdapter.sendPasswordResetEmail(payload.to, payload.fullName, payload.code)
                break
            }
            case 'USER_VERIFIED': {
                const session = new Session(payload.userId, payload.hashedRefreshToken, payload.userAgent, payload.ipAddress, payload.role)
                await this.sessionRepository.save(session)
                break
            }
            default:
                this.logger.warn(`Unknown outbox event type: ${event.type}`)
        }
    }
}
