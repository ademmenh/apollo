import { Email } from './email'
import { Password } from './password'
import { UserId } from './userId'
import { PhoneNumber } from './phone-number'
import { CanNotLoginError } from './errors'
import { UserProfile } from './user-profile'

export type TUserRole = 'Admin' | 'Client' | 'Driver'

export class User {
    private readonly id: UserId
    private email: Email | null
    private password: Password
    private role: TUserRole
    private profile: UserProfile
    private isBanned: boolean
    private createdAt: Date
    private deletedAt: Date | null

    private constructor(
        id: UserId,
        email: Email | null,
        password: Password,
        role: TUserRole,
        profile: UserProfile,
        isBanned: boolean,
        createdAt: Date,
        deletedAt: Date | null,
    ) {
        this.id = id
        this.email = email
        this.password = password
        this.role = role
        this.profile = profile
        this.isBanned = isBanned
        this.createdAt = createdAt
        this.deletedAt = deletedAt
    }

    static create(id: UserId, email: Email | null, password: Password, role: TUserRole, phoneNumber: PhoneNumber | null, fullName: string, birthDate: Date): User {
        const profile = UserProfile.create(id.getValue(), fullName, birthDate, phoneNumber)
        return new User(id, email, password, role, profile, false, new Date(), null)
    }

    static reconstruct(
        id: UserId,
        email: Email | null,
        password: Password,
        role: TUserRole,
        phoneNumber: PhoneNumber | null,
        fullName: string,
        birthDate: Date,
        isBanned: boolean,
        createdAt: Date,
        deletedAt: Date | null,
    ): User {
        const profile = UserProfile.reconstruct(id.getValue(), fullName, birthDate, phoneNumber)
        return new User(id, email, password, role, profile, isBanned, createdAt, deletedAt)
    }

    getId(): UserId {
        return this.id
    }

    getProfile(): UserProfile {
        return this.profile
    }

    getFullName(): string {
        return this.profile.getFullName()
    }

    getEmail(): Email | null {
        return this.email
    }

    getBirthDate(): Date {
        return this.profile.getBirthDate()
    }

    getRole(): TUserRole {
        return this.role
    }

    getPhoneNumber(): PhoneNumber | null {
        return this.profile.getPhoneNumber()
    }

    canLogin(): void {
        if (this.isBanned || this.deletedAt) {
            throw new CanNotLoginError(this.id.getValue())
        }
    }

    getPassword(): Password {
        return this.password
    }

    ban(): void {
        this.isBanned = true
    }

    unban(): void {
        this.isBanned = false
    }

    isUserBanned(): boolean {
        return this.isBanned
    }

    getCreatedAt(): Date {
        return this.createdAt
    }

    getDeletedAt(): Date | null {
        return this.deletedAt
    }

    delete(): void {
        this.deletedAt = new Date()
    }

    changePassword(password: Password): void {
        this.password = password
    }
}
