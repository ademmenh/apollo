import { Field, ID, InputType, ObjectType, registerEnumType, GraphQLISODateTime } from '@nestjs/graphql'

export enum UserRole {
    USER = 'Client',
    ADMIN = 'Admin',
}

registerEnumType(UserRole, {
    name: 'UserRole',
})

@ObjectType({ description: 'User profile information' })
export class ProfileRDTO {
    @Field(() => ID, { description: 'Unique identifier of the profile' })
    id: string

    @Field(() => String, { description: 'Full name of the user' })
    fullName: string

    @Field(() => GraphQLISODateTime, { description: 'Birth date of the user' })
    birthDate: Date

    @Field(() => String, { nullable: true, description: 'Phone number of the user' })
    phoneNumber: string | null
}

@ObjectType({ description: 'System user account' })
export class UserRDTO {
    @Field(() => ID, { description: 'Unique identifier of the user' })
    id: string

    @Field(() => String, { nullable: true, description: 'Email address of the user' })
    email: string | null

    @Field(() => UserRole, { description: 'Role of the user in the system' })
    role: UserRole

    @Field(() => ProfileRDTO, { description: 'Profile details of the user' })
    profile: ProfileRDTO

    @Field(() => GraphQLISODateTime, { description: 'Date when the user was created' })
    createdAt: Date
}

@ObjectType()
export class LoginRDTO {
    @Field(() => UserRDTO)
    user: UserRDTO

    @Field(() => String)
    accessToken: string

    @Field(() => String)
    refreshToken: string
}

@ObjectType()
export class RefreshRDTO {
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
export class RegisterUserDTO {
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
export class LoginDTO {
    @Field(() => String)
    email: string

    @Field(() => String)
    password: string
}

@InputType()
export class VerifyUserDTO {
    @Field(() => ID)
    id: string

    @Field(() => String)
    code: string
}

@InputType()
export class ForgotPasswordResetDTO {
    @Field(() => ID)
    id: string

    @Field(() => String)
    secret: string

    @Field(() => String)
    newPassword: string
}

@InputType()
export class ResetPasswordDTO {
    @Field(() => ID)
    id: string

    @Field(() => String)
    oldPassword: string

    @Field(() => String)
    newPassword: string
}
