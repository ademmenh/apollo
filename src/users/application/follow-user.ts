import { Inject, Injectable } from '@nestjs/common'
import type { IUserRepository } from '../domain/repository'

@Injectable()
export class FollowUserUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    ) { }

    async execute(followerId: string, followingId: string): Promise<void> {
        if (followerId === followingId) {
            throw new Error('You cannot follow yourself')
        }
        await this.userRepository.follow(followerId, followingId)
    }
}
