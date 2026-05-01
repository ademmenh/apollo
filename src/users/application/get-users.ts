import { Inject, Injectable } from '@nestjs/common'
import type { IUserRepository } from '../domain/repository'
import { User } from '../domain/entity'

@Injectable()
export class GetUsersUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    ) { }

    async execute(): Promise<User[]> {
        return this.userRepository.findAll()
    }
}
