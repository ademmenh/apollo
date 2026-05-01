import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { IDGenerator } from '../domain/id-generator'

@Injectable()
export class UUIDGenerator implements IDGenerator {
    newId(): string {
        return randomUUID()
    }
}
