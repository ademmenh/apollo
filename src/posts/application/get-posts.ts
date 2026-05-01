import { Inject, Injectable } from '@nestjs/common'
import type { IPostRepository } from '../domain/repository'
import { Post } from '../domain/entity'

@Injectable()
export class GetPostsUseCase {
    constructor(
        @Inject('IPostRepository') private readonly postRepository: IPostRepository,
    ) { }

    async execute(limit: number, offset: number): Promise<Post[]> {
        return this.postRepository.findAll(limit, offset)
    }
}
