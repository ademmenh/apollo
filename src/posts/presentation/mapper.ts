import { Post } from '../domain/entity'
import type { PostRDTO } from './post.types'

export class PostMapper {
    static toResponse(post: Post): PostRDTO {
        return {
            id: post.getId().getValue(),
            content: post.getContent(),
            createdAt: post.getCreatedAt(),
            authorId: post.getAuthorId().getValue(),
        }
    }
}
