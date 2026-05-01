import { v4 as uuidv4, validate as uuidValidate } from 'uuid'

export class Id {
    private readonly value: string

    private constructor(value: string) {
        this.value = value
    }

    static create(id?: string): Id {
        if (id && !uuidValidate(id)) {
            throw new Error(`Invalid ID: ${id}`)
        }
        return new Id(id || uuidv4())
    }

    getValue(): string {
        return this.value
    }

    equals(other: Id): boolean {
        return this.value === other.value
    }

    toString(): string {
        return this.value
    }
}
