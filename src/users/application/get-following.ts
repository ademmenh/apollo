import { Inject, Injectable } from '@nestjs/common'
import type { IUserRepository } from '../domain/repository'
import { UserProfile } from '../domain/user-profile'

@Injectable()
export class GetFollowingUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    ) { }

    async execute(userId: string, limit: number, offset: number): Promise<UserProfile[]> {
        return this.userRepository.findFollowing(userId, limit, offset)
    }
}
