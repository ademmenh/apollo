import { describe, it, expect, beforeEach } from 'bun:test'
import { GetPostsByUserUseCase } from '../application/get-posts-by-user'
import { InMemoryPostRepository } from '../infrastructure/in-memory-repository'
import { Post, PostId } from '../domain/entity'
import { UserId } from '../../users/domain/userId'
import { randomUUID } from 'crypto'

describe('GetPostsByUserUseCase', () => {
    let postRepository: InMemoryPostRepository
    let useCase: GetPostsByUserUseCase

    beforeEach(() => {
        postRepository = new InMemoryPostRepository()
        useCase = new GetPostsByUserUseCase(postRepository)
    })

    it('should return posts by user', async () => {
        const user1Id = randomUUID()
        const user2Id = randomUUID()
        
        await postRepository.save(Post.create(PostId.create(randomUUID()), UserId.create(user1Id), 'User 1 Post'))
        await postRepository.save(Post.create(PostId.create(randomUUID()), UserId.create(user2Id), 'User 2 Post'))

        const posts = await useCase.execute(user1Id, 10, 0)
        expect(posts.length).toBe(1)
        expect(posts[0].getContent()).toBe('User 1 Post')
    })
})
