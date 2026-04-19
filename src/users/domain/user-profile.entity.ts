import { PhoneNumber } from './value-objects/phone-number.vo'
import { ProfileRDTO } from 'src/auth/presentation/auth.types'

export class UserProfile {
    private constructor(
        private readonly id: string,
        private fullName: string,
        private birthDate: Date,
        private phoneNumber: PhoneNumber,
    ) { }

    static create(id: string, fullName: string, birthDate: Date, phoneNumber: PhoneNumber): UserProfile {
        return new UserProfile(id, fullName, birthDate, phoneNumber)
    }

    static reconstruct(id: string, fullName: string, birthDate: Date, phoneNumber: PhoneNumber): UserProfile {
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

    getPhoneNumber(): PhoneNumber {
        return this.phoneNumber
    }

    toResponse(): ProfileRDTO {
        return {
            id: this.id,
            fullName: this.fullName,
            birthDate: this.birthDate,
            phoneNumber: this.phoneNumber.getValue(),
        }
    }
}
