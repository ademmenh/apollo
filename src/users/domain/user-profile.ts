import { PhoneNumber } from './phone-number'

export class UserProfile {
    private constructor(
        private readonly id: string,
        private fullName: string,
        private birthDate: Date,
        private phoneNumber: PhoneNumber | null,
    ) { }

    static create(id: string, fullName: string, birthDate: Date, phoneNumber: PhoneNumber | null): UserProfile {
        return new UserProfile(id, fullName, birthDate, phoneNumber)
    }

    static reconstruct(id: string, fullName: string, birthDate: Date, phoneNumber: PhoneNumber | null): UserProfile {
        return new UserProfile(id, fullName, birthDate, phoneNumber)
    }

    getId(): string {
        return this.id
    }

    getFullName(): string {
        return this.fullName
    }

    getBirthDate(): Date {
        return this.birthDate
    }

    getPhoneNumber(): PhoneNumber | null {
        return this.phoneNumber
    }
}
