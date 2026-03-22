import { InvalidUserIdError } from '../user.errors'

export class UserId {
    private readonly value: string

    private constructor(value: string) {
        this.value = value
    }

    static create(id: string): UserId {
        if (!id) {
            throw new InvalidUserIdError(id)
        }
        return new UserId(id)
    }

    getValue(): string {
        return this.value
    }

    equals(other: UserId): boolean {
        return this.value === other.value
    }

    toString(): string {
        return this.value
    }
}
