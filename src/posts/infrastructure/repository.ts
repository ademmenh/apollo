import { Inject, Injectable } from '@nestjs/common'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, desc, sql, inArray, and, gt, lte } from 'drizzle-orm'
import { IPostRepository } from '../domain/repository'
import { Post, PostId } from '../domain/entity'
import { postsTable } from './schema'
import { UserId } from '../../users/domain/userId'

@Injectable()
export class PostRepository implements IPostRepository {
    constructor(
        @Inject('DRIZZLE_CLIENT') private readonly db: NodePgDatabase,
    ) { }

    async save(post: Post): Promise<void> {
        await this.db.insert(postsTable).values({
            id: post.getId().getValue(),
            authorId: post.getAuthorId().getValue(),
            content: post.getContent(),
            createdAt: post.getCreatedAt(),
        })
    }

    async findAll(limit: number, offset: number): Promise<Post[]> {
        const results = await this.db.select()
            .from(postsTable)
            .orderBy(desc(postsTable.createdAt))
            .limit(limit)
            .offset(offset)

        return results.map(r => new Post(
            PostId.create(r.id),
            UserId.create(r.authorId),
            r.content,
            r.createdAt,
        ))
    }

    async findByUserId(userId: string, limit: number, offset: number): Promise<Post[]> {
        const results = await this.db.select()
            .from(postsTable)
            .where(eq(postsTable.authorId, userId))
            .orderBy(desc(postsTable.createdAt))
            .limit(limit)
            .offset(offset)

        return results.map(r => new Post(
            PostId.create(r.id),
            UserId.create(r.authorId),
            r.content,
            r.createdAt,
        ))
    }

    async findByUserIds(userIds: string[], limit: number, offset: number): Promise<Post[]> {
        if (userIds.length === 0) return []

        // Use a window function to get row numbers per user
        const subquery = this.db.$with('ranked_posts').as(
            this.db.select({
                id: postsTable.id,
                authorId: postsTable.authorId,
                content: postsTable.content,
                createdAt: postsTable.createdAt,
                rowNumber: sql<number>`row_number() over (partition by ${postsTable.authorId} order by ${postsTable.createdAt} desc)`.as('row_number'),
            })
                .from(postsTable)
                .where(inArray(postsTable.authorId, userIds))
        )

        const results = await this.db
            .with(subquery)
            .select()
            .from(subquery)
            .where(
                and(
                    gt(subquery.rowNumber, offset),
                    lte(subquery.rowNumber, offset + limit)
                )
            )

        return results.map(r => new Post(
            PostId.create(r.id),
            UserId.create(r.authorId),
            r.content,
            r.createdAt,
        ))
    }
}
