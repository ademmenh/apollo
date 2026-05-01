import { Injectable } from '@nestjs/common'
import { IPostRepository } from '../domain/repository'
import { Post } from '../domain/entity'

@Injectable()
export class InMemoryPostRepository implements IPostRepository {
    private posts: Post[] = []

    async save(post: Post): Promise<void> {
        this.posts.push(post)
    }

    async findAll(limit: number, offset: number): Promise<Post[]> {
        return this.posts
            .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime())
            .slice(offset, offset + limit)
    }

    async findByUserId(userId: string, limit: number, offset: number): Promise<Post[]> {
        return this.posts
            .filter(p => p.getAuthorId().getValue() === userId)
            .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime())
            .slice(offset, offset + limit)
    }

    async findByUserIds(userIds: string[], limit: number, offset: number): Promise<Post[]> {
        let results: Post[] = []
        for (const userId of userIds) {
            const userPosts = this.posts
                .filter(p => p.getAuthorId().getValue() === userId)
                .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime())
                .slice(offset, offset + limit)
            results = [...results, ...userPosts]
        }
        return results
    }
}
