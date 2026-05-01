import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { JwtAccessGuard } from '../../auth/presentation/access-token'
import { GqlUser } from '../../common/presentation/gql-user.decorator'
import { type TokenPayload } from '../../auth/domain/token-provider'
import { PostRDTO } from './post.types'
import { CreatePostUseCase } from '../application/create-post'
import { GetPostsUseCase } from '../application/get-posts'
import { GetPostsByUserUseCase } from '../application/get-posts-by-user'
import { PostMapper } from './mapper'
import { ProfileRDTO, UserRDTO } from '../../auth/presentation/auth.types'
import { ProfileDataLoader } from 'src/users/presentation/profile.dataloader'

@Resolver(() => PostRDTO)
@UseGuards(JwtAccessGuard)
export class PostsResolver {
    constructor(
        private readonly createPostUseCase: CreatePostUseCase,
        private readonly getPostsUseCase: GetPostsUseCase,
        private readonly getPostsByUserUseCase: GetPostsByUserUseCase,
        private readonly profileDataLoader: ProfileDataLoader,
    ) { }

    @Mutation(() => PostRDTO, { name: 'createPost' })
    async createPost(
        @GqlUser() user: TokenPayload,
        @Args('content') content: string,
    ): Promise<PostRDTO> {
        const post = await this.createPostUseCase.execute(user.sub, content)
        return PostMapper.toResponse(post)
    }

    @Query(() => [PostRDTO], { name: 'posts' })
    async posts(
        @Args('limit', { type: () => Int }) limit: number,
        @Args('skip', { type: () => Int }) skip: number,
    ): Promise<PostRDTO[]> {
        const posts = await this.getPostsUseCase.execute(limit, skip)
        return posts.map(p => PostMapper.toResponse(p))
    }

    @Query(() => [PostRDTO], { name: 'postsByUser' })
    async postsByUser(
        @Args('userId', { type: () => ID }) userId: string,
        @Args('limit', { type: () => Int }) limit: number,
        @Args('skip', { type: () => Int }) skip: number,
    ): Promise<PostRDTO[]> {
        const posts = await this.getPostsByUserUseCase.execute(userId, limit, skip)
        return posts.map(p => PostMapper.toResponse(p))
    }

    @ResolveField(() => ProfileRDTO)
    async author(@Parent() post: PostRDTO): Promise<ProfileRDTO | null> {
        return this.profileDataLoader.loader.load(post.authorId)
    }
}
