import { User } from '../../users/domain/user.aggregate'
import { UserResponse } from './auth.types'

export class AuthMapper {
    static toResponse(user: User): UserResponse {
        return {
            id: user.getId().getValue(),
            email: user.getEmail()?.getValue() ?? null,
            fullName: user.getFullName(),
            birthDate: user.getBirthDate(),
            phoneNumber: user.getPhoneNumber()?.getValue() ?? null,
            role: user.getRole(),
            createdAt: user.getCreatedAt(),
        }
    }
}
