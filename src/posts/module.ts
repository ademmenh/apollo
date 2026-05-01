import { Module, forwardRef } from '@nestjs/common'
import { PostsResolver } from './presentation/resolver'
import { PostRepository } from './infrastructure/repository'
import { CreatePostUseCase } from './application/create-post'
import { GetPostsUseCase } from './application/get-posts'
import { GetPostsByUserUseCase } from './application/get-posts-by-user'
import { GetPostsByUserIdsUseCase } from './application/get-posts-by-user-ids'
import { PostsDataLoader } from './presentation/posts.dataloader'
import { UsersModule } from '../users/module'

@Module({
    imports: [forwardRef(() => UsersModule)],
    providers: [
        PostsResolver,
        CreatePostUseCase,
        GetPostsUseCase,
        GetPostsByUserUseCase,
        GetPostsByUserIdsUseCase,
        PostsDataLoader,
        {
            provide: 'IPostRepository',
            useClass: PostRepository,
        },
    ],
    exports: [GetPostsByUserUseCase, GetPostsByUserIdsUseCase, PostsDataLoader],
})
export class PostsModule { }
