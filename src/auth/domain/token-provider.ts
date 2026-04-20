import { type TUserRole } from 'src/users/domain/entity'

export interface TokenPayload {
    sub: string
    role: TUserRole
}

export interface ITokenProvider {
    generateAccessToken(userId: string, role: TUserRole): Promise<string>
    generateRefreshToken(userId: string): Promise<string>
    validateAccessToken(token: string): Promise<TokenPayload>
}
