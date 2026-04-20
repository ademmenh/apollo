import { InvalidPhoneNumberError } from './errors'

export class PhoneNumber {
    private readonly value: string

    private constructor(value: string) {
        this.value = value
    }

    static create(phoneNumber: string): PhoneNumber {
        let normalizedNumber = phoneNumber.trim()
        if (normalizedNumber.startsWith('+')) normalizedNumber = '0' + normalizedNumber.slice(4)
        if (normalizedNumber.startsWith('213') && normalizedNumber.length === 12) normalizedNumber = '0' + normalizedNumber.slice(3)
        if (!this.validate(normalizedNumber)) throw new InvalidPhoneNumberError(normalizedNumber)
        return new PhoneNumber(normalizedNumber)
    }

    private static validate(phoneNumber: string): boolean {
        const cleanNumber = phoneNumber.replace(/\D/g, '')
        const phoneRegex = /^(05|06|07)[0-9]{8}$/
        return phoneRegex.test(cleanNumber)
    }

    getValue(): string {
        return this.value
    }

    equals(other: PhoneNumber): boolean {
        return this.value === other.value
    }
}
