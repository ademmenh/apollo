import { User } from './entity'
import { UserProfile } from './user-profile'

export interface IUserRepository {
    save(user: User): Promise<User>
    update(user: User): Promise<User>
    findById(id: string): Promise<User | null>
    findByEmail(email: string): Promise<User | null>
    saveNotVerified(user: User, codeHash: string, attempts: number, eventPayload: { type: string, payload: any }): Promise<void>
    getNotVerifiedUser(id: string): Promise<{ user: User; codeHash: string; attempts: number } | null>
    getNotVerifiedUserByEmail(email: string): Promise<{ user: User; codeHash: string; attempts: number } | null>
    removeNotVerifiedUser(id: string): Promise<void>
    saveForgotPasswordSecret(userId: string, codeHash: string, code: string, attempts: number, eventPayload: { type: string, payload: any }): Promise<void>
    getForgotPasswordSecret(userId: string): Promise<{ codeHash: string; code: string; attempts: number } | null>
    removeForgotPasswordSecret(userId: string): Promise<void>
    findProfilesByIds(ids: string[]): Promise<UserProfile[]>
    findAll(): Promise<User[]>
}
