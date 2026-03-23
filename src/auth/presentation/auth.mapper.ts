import { User } from '../../users/domain/user.aggregate'
import { User as UserDTO, UserRole } from './auth.types'

export class AuthMapper {
    static toResponse(user: User): UserDTO {
        return {
            id: user.getId().getValue(),
            email: user.getEmail()?.getValue() ?? null,
            fullName: user.getFullName(),
            birthDate: user.getBirthDate(),
            phoneNumber: user.getPhoneNumber()?.getValue() ?? null,
            role: user.getRole() as UserRole,
            createdAt: user.getCreatedAt(),
        }
    }
}
