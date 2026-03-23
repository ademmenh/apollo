import { Field, ID, InputType, ObjectType, registerEnumType, GraphQLISODateTime } from '@nestjs/graphql'

export enum UserRole {
    USER = 'Client',
    ADMIN = 'Admin',
}

registerEnumType(UserRole, {
    name: 'UserRole',
})

@ObjectType()
export class User {
    @Field(() => ID)
    id: string

    @Field(() => String, { nullable: true })
    email: string | null

    @Field(() => String)
    fullName: string

    @Field(() => GraphQLISODateTime)
    birthDate: Date

    @Field(() => String, { nullable: true })
    phoneNumber: string | null

    @Field(() => UserRole)
    role: UserRole

    @Field(() => GraphQLISODateTime)
    createdAt: Date
}

@ObjectType()
export class LoginResponse {
    @Field(() => User)
    user: User

    @Field(() => String)
    accessToken: string

    @Field(() => String)
    refreshToken: string
}

@ObjectType()
export class RefreshResponse {
    @Field(() => String)
    accessToken: string

    @Field(() => String)
    refreshToken: string
}

@ObjectType()
export class SuccessResponse {
    @Field(() => String)
    message: string
}

@InputType()
export class RegisterUserInput {
    @Field(() => String)
    email: string

    @Field(() => String)
    fullName: string

    @Field(() => String)
    birthDate: string

    @Field(() => String)
    password: string

    @Field(() => String)
    phoneNumber?: string
}

@InputType()
export class LoginInput {
    @Field(() => String)
    email: string

    @Field(() => String)
    password: string
}

@InputType()
export class VerifyUserInput {
    @Field(() => ID)
    id: string

    @Field(() => String)
    code: string
}

@InputType()
export class ForgotPasswordResetInput {
    @Field(() => ID)
    id: string

    @Field(() => String)
    secret: string

    @Field(() => String)
    newPassword: string
}

@InputType()
export class ResetPasswordInput {
    @Field(() => ID)
    id: string

    @Field(() => String)
    oldPassword: string

    @Field(() => String)
    newPassword: string
}
