import { IPasswordHasher } from '../../auth/domain/password-hasher'
import { WeakPasswordError } from './errors'

export class Password {
    private readonly hashedValue: string

    private constructor(hashedValue: string) {
        this.hashedValue = hashedValue
    }

    static fromHash(hash: string): Password {
        return new Password(hash)
    }

    /**
     * Creates a new Password instance by hashing a plain text password
     */
    static async create(plain: string, hasher: IPasswordHasher): Promise<Password> {
        if (plain.length < 6) {
            throw new WeakPasswordError('Password must be at least 6 characters long')
        }
        const hashed = await hasher.hash(plain)
        return new Password(hashed)
    }

    getHash(): string {
        return this.hashedValue
    }

    async compare(plain: string, hasher: IPasswordHasher): Promise<boolean> {
        return hasher.compare(plain, this.hashedValue)
    }
}
