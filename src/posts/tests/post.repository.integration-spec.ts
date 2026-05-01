import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'bun:test'
import { Test, TestingModule } from '@nestjs/testing'
import { PostRepository } from '../infrastructure/repository'
import { DrizzleModule } from '../../config/infrastructure/drizzle-module'
import { ConfigModule } from '../../config/module'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { postsTable } from '../infrastructure/schema'
import { usersTable, profilesTable, followsTable } from '../../users/infrastructure/schema'
import { Post, PostId } from '../domain/entity'
import { UserId } from '../../users/domain/userId'
import { Email } from '../../users/domain/email'
import { Password } from '../../users/domain/password'
import { User } from '../../users/domain/entity'
import { sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { Logger } from '../../common/infrastructure/logger'
import * as winston from 'winston'

describe('PostRepository (Integration)', () => {
    let repository: PostRepository
    let db: NodePgDatabase
    let authorId: string

    beforeAll(async () => {
        const dummyLogger = new Logger([new winston.transports.Console({ silent: true })])
        const module: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule, DrizzleModule],
            providers: [
                PostRepository,
                { provide: 'APP_LOGGER', useValue: dummyLogger },
                { provide: 'WORKER_LOGGER', useValue: dummyLogger },
            ],
        }).compile()
        repository = module.get<PostRepository>(PostRepository)
        db = module.get<NodePgDatabase>('DRIZZLE_CLIENT')
    })

    beforeEach(async () => {
        // Create a user for authorId
        authorId = randomUUID()
        const user = User.create(
            UserId.create(authorId),
            Email.create('author@example.com'),
            await Password.create('Password123!', { hash: (p: string) => Promise.resolve(p) } as any),
            'Client',
            null,
            'Author',
            new Date()
        )
        // Manual insert to avoid depending on UserRepository
        await db.insert(usersTable).values({
            id: user.getId().getValue(),
            email: 'author@example.com',
            password: 'hashed_password',
            role: 'Client'
        })
        await db.insert(profilesTable).values({ id: user.getId().getValue(), fullName: 'Author', birthDate: new Date() })
    })

    afterEach(async () => {
        await db.execute(sql`TRUNCATE TABLE ${postsTable}, ${followsTable}, ${profilesTable}, ${usersTable} RESTART IDENTITY CASCADE`)
    })

    it('should save and find posts', async () => {
        const postId = PostId.create(randomUUID())
        const post = Post.create(postId, UserId.create(authorId), 'Integration test post')

        await repository.save(post)

        const allPosts = await repository.findAll(10, 0)
        expect(allPosts.length).toBe(1)
        expect(allPosts[0].getContent()).toBe('Integration test post')
        expect(allPosts[0].getAuthorId().getValue()).toBe(authorId)
    })

    it('should find posts by user id', async () => {
        const post = Post.create(PostId.create(randomUUID()), UserId.create(authorId), 'User post')
        await repository.save(post)

        const userPosts = await repository.findByUserId(authorId, 10, 0)
        expect(userPosts.length).toBe(1)
        expect(userPosts[0].getContent()).toBe('User post')
    })
})
