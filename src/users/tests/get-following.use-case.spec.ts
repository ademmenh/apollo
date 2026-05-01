import { describe, it, expect, beforeEach } from 'bun:test'
import { GetFollowingUseCase } from '../application/get-following'
import { InMemoryUserRepository } from '../infrastructure/in-memory-repository'
import { User } from '../domain/entity'
import { UserId } from '../domain/userId'
import { Email } from '../domain/email'
import { randomUUID } from 'crypto'

describe('GetFollowingUseCase', () => {
    let userRepository: InMemoryUserRepository
    let useCase: GetFollowingUseCase

    beforeEach(() => {
        userRepository = new InMemoryUserRepository()
        useCase = new GetFollowingUseCase(userRepository)
    })

    it('should return following users', async () => {
        const user1Id = randomUUID()
        const user2Id = randomUUID()
        const user1 = User.create(UserId.create(user1Id), Email.create('user1@example.com'), null as any, 'Client', null, 'User One', new Date())
        const user2 = User.create(UserId.create(user2Id), Email.create('user2@example.com'), null as any, 'Client', null, 'User Two', new Date())
        await userRepository.save(user1)
        await userRepository.save(user2)
        await userRepository.follow(user1Id, user2Id)

        const result = await useCase.execute(user1Id, 10, 0)

        expect(result.length).toBe(1)
        expect(result[0].getId()).toBe(user2Id)
    })
})
