import { Inject, Injectable } from '@nestjs/common'
import type { IPostRepository } from '../domain/repository'
import { Post, PostId } from '../domain/entity'
import { UserId } from '../../users/domain/userId'
import type { IDGenerator } from '../../common/domain/id-generator'

@Injectable()
export class CreatePostUseCase {
    constructor(
        @Inject('IPostRepository') private readonly postRepository: IPostRepository,
        @Inject('IDGenerator') private readonly idGenerator: IDGenerator,
    ) { }

    async execute(authorId: string, content: string): Promise<Post> {
        const post = Post.create(
            PostId.create(this.idGenerator.newId()),
            UserId.create(authorId),
            content,
        )
        await this.postRepository.save(post)
        return post
    }
}
