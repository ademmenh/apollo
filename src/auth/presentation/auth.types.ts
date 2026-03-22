import { Field, ID, InputType, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class UserResponse {
    @Field(() => ID)
    id: string

    @Field(() => String, { nullable: true })
    email: string | null

    @Field(() => String)
    fullName: string

    @Field(() => Date)
    birthDate: Date

    @Field(() => String, { nullable: true })
    phoneNumber: string | null

    @Field(() => String)
    role: string

    @Field(() => Date)
    createdAt: Date
}

@ObjectType()
export class LoginResponse {
    @Field(() => UserResponse)
    user: UserResponse

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
    email: string = ''

    @Field(() => String)
    fullName: string = ''

    @Field(() => String)
    birthDate: string = ''

    @Field(() => String)
    password: string = ''

    @Field(() => String, { nullable: true })
    phoneNumber?: string
}

@InputType()
export class LoginInput {
    @Field(() => String)
    email: string = ''

    @Field(() => String)
    password: string = ''
}

@InputType()
export class VerifyUserInput {
    @Field(() => ID)
    id: string = ''

    @Field(() => String)
    code: string = ''
}

@InputType()
export class ForgotPasswordResetInput {
    @Field(() => ID)
    id: string = ''

    @Field(() => String)
    secret: string = ''

    @Field(() => String)
    newPassword: string = ''
}

@InputType()
export class ResetPasswordInput {
    @Field(() => ID)
    id: string = ''

    @Field(() => String)
    oldPassword: string = ''

    @Field(() => String)
    newPassword: string = ''
}
