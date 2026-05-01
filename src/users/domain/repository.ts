import { User } from './entity'
import { UserProfile } from './user-profile'
import { OutboxEvent } from '../../outbox/domain/outbox-event.entity'

export interface IUserRepository {
    save(user: User): Promise<User>
    update(user: User): Promise<User>
    findById(id: string): Promise<User | null>
    findByEmail(email: string): Promise<User | null>
    saveNotVerified(user: User, codeHash: string, attempts: number, event: OutboxEvent): Promise<void>
    setNotVerified(user: User, codeHash: string, attempts: number): Promise<void>
    getNotVerified(id: string): Promise<{ user: User; codeHash: string; attempts: number } | null>
    getNotVerifiedByEmail(email: string): Promise<{ user: User; codeHash: string; attempts: number } | null>
    removeNotVerified(id: string): Promise<void>
    saveForgotPasswordSecret(userId: string, codeHash: string, code: string, attempts: number, event: OutboxEvent): Promise<void>
    setForgotPasswordSecret(userId: string, codeHash: string, code: string, attempts: number): Promise<void>
    getForgotPasswordSecret(userId: string): Promise<{ codeHash: string; code: string; attempts: number } | null>
    removeForgotPasswordSecret(userId: string): Promise<void>
    findProfilesByIds(ids: string[]): Promise<UserProfile[]>
    findAll(): Promise<User[]>
}
