import { User } from './user.aggregate'
import { Session } from 'src/auth/domain/session.entity'

export interface IUserRepository {
    save(user: User, eventPayload: { type: string, payload: Session }): Promise<User>
    update(user: User): Promise<User>
    findById(id: string): Promise<User | null>
    findByEmail(email: string): Promise<User | null>
    findByPhone(phone: string): Promise<User | null>
    saveNotVerified(user: User, codeHash: string, attempts: number, eventPayload: { type: string, payload: any }): Promise<void>
    getNotVerifiedUser(id: string): Promise<{ user: User; codeHash: string; attempts: number } | null>
    getNotVerifiedUserByPhone(phone: string): Promise<{ user: User; codeHash: string; attempts: number } | null>
    removeNotVerifiedUser(id: string): Promise<void>
    saveForgotPasswordSecret(userId: string, codeHash: string, code: string, attempts: number, eventPayload: { type: string, payload: any }): Promise<void>
    getForgotPasswordSecret(userId: string): Promise<{ codeHash: string; code: string; attempts: number } | null>
    removeForgotPasswordSecret(userId: string): Promise<void>
}
