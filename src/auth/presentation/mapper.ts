import { User } from '../../users/domain/entity'
import { UserRDTO, UserRole } from './auth.types'
import { ProfileMapper } from '../../users/presentation/mapper'

export class AuthMapper {
    static toResponse(user: User): UserRDTO {
        return {
            id: user.getId().getValue(),
            email: user.getEmail()?.getValue() ?? null,
            role: user.getRole() as UserRole,
            createdAt: user.getCreatedAt(),
            profile: ProfileMapper.toResponse(user.getProfile()),
        }
    }
}
