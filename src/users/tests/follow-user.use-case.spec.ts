import { describe, it, expect, beforeEach } from 'bun:test'
import { FollowUserUseCase } from '../application/follow-user'
import { InMemoryUserRepository } from '../infrastructure/in-memory-repository'
import { User } from '../domain/entity'
import { UserId } from '../domain/userId'
import { Email } from '../domain/email'
import { randomUUID } from 'crypto'

describe('FollowUserUseCase', () => {
    let userRepository: InMemoryUserRepository
    let useCase: FollowUserUseCase

    beforeEach(() => {
        userRepository = new InMemoryUserRepository()
        useCase = new FollowUserUseCase(userRepository)
    })

    it('should follow a user', async () => {
        const user1Id = randomUUID()
        const user2Id = randomUUID()
        const user1 = User.create(UserId.create(user1Id), Email.create('user1@example.com'), null as any, 'Client', null, 'User One', new Date())
        const user2 = User.create(UserId.create(user2Id), Email.create('user2@example.com'), null as any, 'Client', null, 'User Two', new Date())
        await userRepository.save(user1)
        await userRepository.save(user2)

        await useCase.execute(user1Id, user2Id)

        const following = await userRepository.findFollowing(user1Id, 10, 0)
        expect(following.length).toBe(1)
        expect(following[0].getId()).toBe(user2Id)
    })

    it('should throw an error if trying to follow self', async () => {
        const userId = randomUUID()
        expect(useCase.execute(userId, userId)).rejects.toThrow('You cannot follow yourself')
    })
})
