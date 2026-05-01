import { Field, ID, ObjectType, GraphQLISODateTime } from '@nestjs/graphql'
import { ProfileRDTO } from '../../auth/presentation/auth.types'

@ObjectType({ description: 'A social post created by a user' })
export class PostRDTO {
    @Field(() => ID)
    id: string

    @Field(() => String)
    content: string

    @Field(() => GraphQLISODateTime)
    createdAt: Date

    @Field(() => ID)
    authorId: string

    @Field(() => ProfileRDTO, { description: 'The author profile of the post' })
    author?: ProfileRDTO
}
