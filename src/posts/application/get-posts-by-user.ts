import { Inject, Injectable } from '@nestjs/common'
import type { IPostRepository } from '../domain/repository'
import { Post } from '../domain/entity'

@Injectable()
export class GetPostsByUserUseCase {
    constructor(
        @Inject('IPostRepository') private readonly postRepository: IPostRepository,
    ) { }

    async execute(userId: string, limit: number, offset: number): Promise<Post[]> {
        return this.postRepository.findByUserId(userId, limit, offset)
    }
}
