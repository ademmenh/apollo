import { Inject, Injectable } from '@nestjs/common'
import type { IUserRepository } from '../domain/repository'
import { UserProfile } from '../domain/user-profile'

@Injectable()
export class GetFollowersUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    ) { }

    async execute(userId: string, limit: number, offset: number): Promise<UserProfile[]> {
        return this.userRepository.findFollowers(userId, limit, offset)
    }
}
