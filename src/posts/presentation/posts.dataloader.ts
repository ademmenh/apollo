import { Injectable, Scope } from '@nestjs/common'
import DataLoader from 'dataloader'
import { PostRDTO } from './post.types'
import { GetPostsByUserIdsUseCase } from '../application/get-posts-by-user-ids'
import { PostMapper } from './mapper'

interface PostLoaderKey {
    userId: string
    limit: number
    skip: number
}

@Injectable({ scope: Scope.REQUEST })
export class PostsDataLoader {
    public readonly loader: DataLoader<PostLoaderKey, PostRDTO[], string>

    constructor(
        private readonly getPostsByUserIds: GetPostsByUserIdsUseCase,
    ) {
        this.loader = new DataLoader<PostLoaderKey, PostRDTO[], string>(
            async (keys: readonly PostLoaderKey[]) => {
                const userIds = keys.map(k => k.userId)
                const { limit, skip } = keys[0]
                const posts = await this.getPostsByUserIds.execute(userIds, limit, skip)
                const postsByAuthor = new Map<string, PostRDTO[]>()
                posts.forEach(p => {
                    const authorId = p.getAuthorId().getValue()
                    if (!postsByAuthor.has(authorId)) postsByAuthor.set(authorId, [])
                    postsByAuthor.get(authorId)?.push(PostMapper.toResponse(p))
                })
                return userIds.map(id => postsByAuthor.get(id) ?? [])
            },
            {
                cacheKeyFn: (key) => `${key.userId}:${key.limit}:${key.skip}`
            }
        )
    }
}
