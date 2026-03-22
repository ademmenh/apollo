import { TUserRole } from 'src/users/domain/value-objects/user-role.vo'

export interface UserPayload {
    sub: string
    role: TUserRole
}

export interface ITokenProvider {
    generateAccessToken(userId: string, role: TUserRole): Promise<string>
    generateRefreshToken(userId: string): Promise<string>
    validateAccessToken(token: string): Promise<UserPayload>
}
