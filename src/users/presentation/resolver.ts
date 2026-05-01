import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { UseGuards, Inject, forwardRef } from '@nestjs/common'
import { UserRDTO, ProfileRDTO, SuccessResponse } from '../../auth/presentation/auth.types'
import { ProfileDataLoader } from './profile.dataloader'
import { ProfileNotFoundError } from '../domain/errors'
import { GetUsersUseCase } from '../application/get-users'
import { GetUserUseCase } from '../application/get-user'
import { FollowUserUseCase } from '../application/follow-user'
import { GetFollowersUseCase } from '../application/get-followers'
import { GetFollowingUseCase } from '../application/get-following'
import { JwtAccessGuard } from '../../auth/presentation/access-token'
import { GqlUser } from '../../common/presentation/gql-user.decorator'
import { type TokenPayload } from '../../auth/domain/token-provider'
import { UserMapper, ProfileMapper } from './mapper'
import { PostRDTO } from '../../posts/presentation/post.types'
import { PostsDataLoader } from '../../posts/presentation/posts.dataloader'

@Resolver(() => UserRDTO)
@UseGuards(JwtAccessGuard)
export class UsersResolver {
    constructor(
        private readonly profileDataLoader: ProfileDataLoader,
        private readonly getUsersUseCase: GetUsersUseCase,
        private readonly getUserUseCase: GetUserUseCase,
        private readonly followUserUseCase: FollowUserUseCase,
        private readonly getFollowersUseCase: GetFollowersUseCase,
        private readonly getFollowingUseCase: GetFollowingUseCase,
        @Inject(forwardRef(() => PostsDataLoader))
        private readonly postsDataLoader: PostsDataLoader,
    ) { }

    @Query(() => [UserRDTO], { name: 'users', description: 'Retrieve a list of all registered users' })
    async users(
        @Args('limit', { type: () => Int }) limit: number,
        @Args('skip', { type: () => Int }) skip: number,
    ): Promise<UserRDTO[]> {
        const users = await this.getUsersUseCase.execute(limit, skip)
        return users.map(u => UserMapper.toResponse(u))
    }

    @Query(() => UserRDTO, { name: 'user', nullable: true, description: 'Retrieve a single user by their ID' })
    async user(@Args('id', { type: () => ID }) id: string): Promise<UserRDTO | null> {
        const user = await this.getUserUseCase.execute(id)
        if (!user) return null
        return UserMapper.toResponse(user)
    }

    @Mutation(() => SuccessResponse, { name: 'followUser', description: 'Follow another user' })
    async followUser(
        @GqlUser() user: TokenPayload,
        @Args('followingId', { type: () => ID }) followingId: string,
    ): Promise<SuccessResponse> {
        await this.followUserUseCase.execute(user.sub, followingId)
        return { message: 'Successfully followed user' }
    }

    @Query(() => [ProfileRDTO], { name: 'followers', description: 'Get followers of a user' })
    async followers(
        @Args('userId', { type: () => ID }) userId: string,
        @Args('limit', { type: () => Int }) limit: number,
        @Args('skip', { type: () => Int }) skip: number,
    ): Promise<ProfileRDTO[]> {
        const followers = await this.getFollowersUseCase.execute(userId, limit, skip)
        return followers.map(f => ProfileMapper.toResponse(f))
    }

    @Query(() => [ProfileRDTO], { name: 'following', description: 'Get users a user is following' })
    async following(
        @Args('userId', { type: () => ID }) userId: string,
        @Args('limit', { type: () => Int }) limit: number,
        @Args('skip', { type: () => Int }) skip: number,
    ): Promise<ProfileRDTO[]> {
        const following = await this.getFollowingUseCase.execute(userId, limit, skip)
        return following.map(f => ProfileMapper.toResponse(f))
    }

    @ResolveField(() => [ProfileRDTO], { description: 'The list of users following this user' })
    async followersList(
        @Parent() user: UserRDTO,
        @Args('limit', { type: () => Int }) limit: number,
        @Args('skip', { type: () => Int }) skip: number,
    ): Promise<ProfileRDTO[]> {
        const followers = await this.getFollowersUseCase.execute(user.id, limit, skip)
        return followers.map(f => ProfileMapper.toResponse(f))
    }

    @ResolveField(() => [ProfileRDTO], { description: 'The list of users this user is following' })
    async followingList(
        @Parent() user: UserRDTO,
        @Args('limit', { type: () => Int }) limit: number,
        @Args('skip', { type: () => Int }) skip: number,
    ): Promise<ProfileRDTO[]> {
        const following = await this.getFollowingUseCase.execute(user.id, limit, skip)
        return following.map(f => ProfileMapper.toResponse(f))
    }

    @ResolveField(() => ProfileRDTO, { description: 'The profile associated with the user' })
    async profile(@Parent() user: UserRDTO): Promise<ProfileRDTO> {
        if (user.profile) return user.profile
        const profile = await this.profileDataLoader.loader.load(user.id)
        if (!profile) throw new ProfileNotFoundError(user.id)
        return profile
    }

    @ResolveField(() => [PostRDTO], { name: 'posts', description: "The list of posts created by this user" })
    async posts(
        @Parent() user: UserRDTO,
        @Args('limit', { type: () => Int }) limit: number,
        @Args('skip', { type: () => Int }) skip: number,
    ): Promise<PostRDTO[]> {
        return this.postsDataLoader.loader.load({ userId: user.id, limit, skip })
    }
}
