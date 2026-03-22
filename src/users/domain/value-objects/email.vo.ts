import { InvalidEmailError } from '../user.errors'

export class Email {
    private readonly value: string

    private constructor(value: string) {
        this.value = value
    }

    static create(email: string): Email {
        if (!this.validate(email)) {
            throw new InvalidEmailError(email)
        }
        return new Email(email.toLowerCase())
    }

    private static validate(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    getValue(): string {
        return this.value
    }

    equals(other: Email): boolean {
        return this.value === other.value
    }

    toString(): string {
        return this.value
    }
}
