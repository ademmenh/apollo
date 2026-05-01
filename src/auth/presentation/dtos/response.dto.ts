import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

export interface IResponse<T> {
    message: string
    statusCode: number
    data: T
}

export interface IAuthResponse<T> extends IResponse<T> {
    tokens: {
        accessToken: string
        refreshToken: string
    }
}

export class TokensRDTO {
    @Expose()
    @ApiProperty({ example: 'access_token' })
    accessToken: string

    @Expose()
    @ApiProperty({ example: 'refresh_token' })
    refreshToken: string
}

export class UserProfileRDTO {
    @Expose()
    @ApiProperty()
    id: string

    @Expose()
    @ApiProperty()
    email: string | null

    @Expose()
    @ApiProperty()
    fullName: string

    @Expose()
    @ApiProperty()
    birthDate: Date

    @Expose()
    @ApiProperty({ nullable: true })
    phoneNumber: string | null

    @Expose()
    @ApiProperty()
    role: string

    @Expose()
    @ApiProperty({ nullable: true })
    photoUrl: string | null

    @Expose()
    @ApiProperty()
    createdAt: Date
}
