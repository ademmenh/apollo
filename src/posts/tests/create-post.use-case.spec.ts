import { describe, it, expect, beforeEach, jest } from 'bun:test'
import { CreatePostUseCase } from '../application/create-post'
import { InMemoryPostRepository } from '../infrastructure/in-memory-repository'
import { randomUUID } from 'crypto'

describe('CreatePostUseCase', () => {
    let postRepository: InMemoryPostRepository
    let idGenerator: any
    let useCase: CreatePostUseCase

    beforeEach(() => {
        postRepository = new InMemoryPostRepository()
        idGenerator = { newId: jest.fn().mockReturnValue(randomUUID()) }
        useCase = new CreatePostUseCase(postRepository, idGenerator)
    })

    it('should create a post', async () => {
        const authorId = randomUUID()
        const content = 'Test content'

        const post = await useCase.execute(authorId, content)

        expect(post.getContent()).toBe(content)
        expect(post.getAuthorId().getValue()).toBe(authorId)
        
        const allPosts = await postRepository.findAll(10, 0)
        expect(allPosts.length).toBe(1)
        expect(allPosts[0].getId().getValue()).toBe(post.getId().getValue())
    })
})
