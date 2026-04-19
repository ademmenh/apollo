import { User } from '../../users/domain/user.aggregate'
import { UserRDTO, UserRole } from './auth.types'

export class AuthMapper {
    static toResponse(user: User): UserRDTO {
        return {
            id: user.getId().getValue(),
            email: user.getEmail()?.getValue() ?? null,
            role: user.getRole() as UserRole,
            createdAt: user.getCreatedAt(),
            profile: user.getProfile().toResponse(),
        }
    }
}
