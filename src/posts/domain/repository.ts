import { Post } from './entity'

export interface IPostRepository {
    save(post: Post): Promise<void>
    findAll(limit: number, offset: number): Promise<Post[]>
    findByUserId(userId: string, limit: number, offset: number): Promise<Post[]>
    findByUserIds(userIds: string[], limit: number, offset: number): Promise<Post[]>
}
