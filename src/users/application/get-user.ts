import { Inject, Injectable } from '@nestjs/common'
import type { IUserRepository } from '../domain/repository'
import { User } from '../domain/entity'

@Injectable()
export class GetUserUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    ) { }

    async execute(id: string): Promise<User | null> {
        return this.userRepository.findById(id)
    }
}
