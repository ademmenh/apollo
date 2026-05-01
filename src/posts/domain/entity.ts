import { UserId } from '../../users/domain/userId'

export class PostId {
    constructor(private readonly value: string) { }

    static create(value: string): PostId {
        return new PostId(value)
    }

    getValue(): string {
        return this.value
    }
}

export class Post {
    constructor(
        private readonly id: PostId,
        private readonly authorId: UserId,
        private readonly content: string,
        private readonly createdAt: Date,
    ) { }

    static create(id: PostId, authorId: UserId, content: string): Post {
        return new Post(id, authorId, content, new Date())
    }

    getId(): PostId { return this.id }
    getAuthorId(): UserId { return this.authorId }
    getContent(): string { return this.content }
    getCreatedAt(): Date { return this.createdAt }
}
