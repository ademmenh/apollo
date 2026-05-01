import { describe, it, expect, beforeEach } from 'bun:test'
import { GetPostsUseCase } from '../application/get-posts'
import { InMemoryPostRepository } from '../infrastructure/in-memory-repository'
import { Post, PostId } from '../domain/entity'
import { UserId } from '../../users/domain/userId'
import { randomUUID } from 'crypto'

describe('GetPostsUseCase', () => {
    let postRepository: InMemoryPostRepository
    let useCase: GetPostsUseCase

    beforeEach(() => {
        postRepository = new InMemoryPostRepository()
        useCase = new GetPostsUseCase(postRepository)
    })

    it('should return paginated posts', async () => {
        const authorId = UserId.create(randomUUID())
        const post1 = new Post(PostId.create(randomUUID()), authorId, 'Post 1', new Date(Date.now() - 10000))
        const post2 = new Post(PostId.create(randomUUID()), authorId, 'Post 2', new Date())
        
        await postRepository.save(post1)
        await postRepository.save(post2)

        const posts = await useCase.execute(1, 0)
        expect(posts.length).toBe(1)
        expect(posts[0].getContent()).toBe('Post 2')
    })
})
