import type { IUserRepository } from 'src/users/domain/repository'
import { User } from 'src/users/domain/entity'
import { UserProfile } from '../domain/user-profile'

export class InMemoryUserRepository implements IUserRepository {
    private users: Map<string, User> = new Map()
    private notVerifiedUsers: Map<string, { user: User; codeHash: string; attempts: number }> = new Map()
    private forgotPasswordSecrets: Map<string, { codeHash: string; code: string; attempts: number }> = new Map()

    async save(user: User): Promise<User> {
        this.users.set(user.getId().getValue(), user)
        return user
    }

    async update(user: User): Promise<User> {
        this.users.set(user.getId().getValue(), user)
        return user
    }

    async findById(id: string): Promise<User | null> {
        return this.users.get(id) || null
    }

    async findByEmail(email: string): Promise<User | null> {
        for (const user of this.users.values()) {
            if (user.getEmail()?.getValue() === email) return user
        }
        return null
    }

    async saveNotVerified(user: User, codeHash: string, attempts: number, eventPayload: { type: string; payload: any }): Promise<void> {
        this.notVerifiedUsers.set(user.getId().getValue(), { user, codeHash, attempts })
    }

    async getNotVerifiedUser(id: string): Promise<{ user: User; codeHash: string; attempts: number } | null> {
        return this.notVerifiedUsers.get(id) || null
    }

    async getNotVerifiedUserByPhone(phone: string): Promise<{ user: User; codeHash: string; attempts: number } | null> {
        for (const notVerified of this.notVerifiedUsers.values()) {
            if (notVerified.user.getPhoneNumber()?.getValue() === phone) return notVerified
        }
        return null
    }

    async getNotVerifiedUserByEmail(email: string): Promise<{ user: User; codeHash: string; attempts: number } | null> {
        for (const notVerified of this.notVerifiedUsers.values()) {
            if (notVerified.user.getEmail()?.getValue() === email) return notVerified
        }
        return null
    }

    async removeNotVerifiedUser(id: string): Promise<void> {
        this.notVerifiedUsers.delete(id)
    }

    async saveForgotPasswordSecret(userId: string, codeHash: string, code: string, attempts: number, eventPayload: { type: string; payload: any }): Promise<void> {
        this.forgotPasswordSecrets.set(userId, { codeHash, code, attempts })
    }

    async getForgotPasswordSecret(userId: string): Promise<{ codeHash: string; code: string; attempts: number } | null> {
        return this.forgotPasswordSecrets.get(userId) || null
    }

    async removeForgotPasswordSecret(userId: string): Promise<void> {
        this.forgotPasswordSecrets.delete(userId)
    }

    async findProfilesByIds(ids: string[]): Promise<UserProfile[]> {
        const results: UserProfile[] = []
        for (const user of this.users.values()) {
            if (ids.includes(user.getId().getValue())) {
                results.push(user.getProfile())
            }
        }
        return results
    }

    async findAll(): Promise<User[]> {
        return Array.from(this.users.values())
    }

    // Helper for tests
    getAll(): User[] {
        return Array.from(this.users.values())
    }

    clear(): void {
        this.users.clear()
        this.notVerifiedUsers.clear()
        this.forgotPasswordSecrets.clear()
    }
}
