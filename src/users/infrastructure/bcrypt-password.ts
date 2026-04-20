import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { IPasswordHasher } from 'src/auth/domain/password-hasher'

@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher {
    async hash(plain: string): Promise<string> {
        return bcrypt.hash(plain, 10)
    }

    async compare(plain: string, hashed: string): Promise<boolean> {
        return bcrypt.compare(plain, hashed)
    }
}
