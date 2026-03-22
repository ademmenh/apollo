import { TUserRole } from './value-objects/user-role.vo'
import { Email } from './value-objects/email.vo'
import { Password } from './value-objects/password.vo'
import { UserId } from './value-objects/user-id.vo'
import { PhoneNumber } from './value-objects/phone-number.vo'
import { CanNotLoginError } from './user.errors'

export class User {
    private readonly id: UserId
    private fullName: string
    private email: Email | null
    private password: Password
    private birthDate: Date
    private role: TUserRole
    private phoneNumber: PhoneNumber
    private isBanned: boolean
    private createdAt: Date
    private deletedAt: Date | null

    private constructor(
        id: UserId,
        email: Email | null,
        password: Password,
        role: TUserRole,
        phoneNumber: PhoneNumber,
        fullName: string,
        birthDate: Date,
        isBanned: boolean,
        createdAt: Date,
        deletedAt: Date | null,
    ) {
        this.id = id
        this.fullName = fullName
        this.email = email
        this.password = password
        this.birthDate = birthDate
        this.role = role
        this.phoneNumber = phoneNumber
        this.isBanned = isBanned
        this.createdAt = createdAt
        this.deletedAt = deletedAt
    }

    static create(id: UserId, email: Email | null, password: Password, role: TUserRole, phoneNumber: PhoneNumber, fullName: string, birthDate: Date): User {
        // if (!id) throw new Error('id is required')
        // if (!password) throw new Error('password is required')
        // if (!role) throw new Error('role is required')
        // if (!phoneNumber) throw new Error('phoneNumber is required')
        // if (!fullName) throw new Error('fullName is required')
        // if (!birthDate) throw new Error('birthDate is required')

        return new User(id, email, password, role, phoneNumber, fullName, birthDate, false, new Date(), null)
    }

    static reconstruct(
        id: UserId,
        email: Email | null,
        password: Password,
        role: TUserRole,
        phoneNumber: PhoneNumber,
        fullName: string,
        birthDate: Date,
        isBanned: boolean,
        createdAt: Date,
        deletedAt: Date | null,
    ): User {
        if (!id) throw new Error('id is required')
        if (!password) throw new Error('password is required')
        if (!role) throw new Error('role is required')
        if (!phoneNumber) throw new Error('phoneNumber is required')
        if (!fullName) throw new Error('fullName is required')
        if (!birthDate) throw new Error('birthDate is required')
        if (isBanned === null || isBanned === undefined) throw new Error('isBanned is required')
        if (!createdAt) throw new Error('createdAt is required')

        return new User(id, email, password, role, phoneNumber, fullName, birthDate, isBanned, createdAt, deletedAt)
    }

    getId(): UserId {
        return this.id
    }

    getFullName(): string {
        return this.fullName
    }

    getEmail(): Email | null {
        return this.email
    }

    getBirthDate(): Date {
        return this.birthDate
    }

    getRole(): TUserRole {
        return this.role
    }

    getPhoneNumber(): PhoneNumber {
        return this.phoneNumber
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
