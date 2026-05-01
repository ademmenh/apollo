import { Inject, Injectable } from '@nestjs/common'
import type { IPostRepository } from '../domain/repository'
import { Post } from '../domain/entity'

@Injectable()
export class GetPostsByUserIdsUseCase {
    constructor(
        @Inject('IPostRepository')
        private readonly postRepository: IPostRepository,
    ) { }

    async execute(userIds: string[], limit: number, offset: number): Promise<Post[]> {
        return this.postRepository.findByUserIds(userIds, limit, offset)
    }
}
