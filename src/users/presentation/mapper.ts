import { User } from '../domain/entity'
import { UserProfile } from '../domain/user-profile'
import { type UserRDTO, type ProfileRDTO } from '../../auth/presentation/auth.types'

export class ProfileMapper {
    static toResponse(profile: UserProfile): ProfileRDTO {
        return {
            id: profile.getId(),
            fullName: profile.getFullName(),
            birthDate: profile.getBirthDate(),
            phoneNumber: profile.getPhoneNumber()?.getValue() ?? null,
        }
    }
}

export class UserMapper {
    static toResponse(u: User): UserRDTO {
        return {
            id: u.getId().getValue(),
            email: u.getEmail()?.getValue() || null,
            role: u.getRole() as any,
            createdAt: u.getCreatedAt(),
            profile: ProfileMapper.toResponse(u.getProfile())
        }
    }
}
