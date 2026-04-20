import { UserProfile } from '../domain/user-profile'
import { ProfileRDTO } from '../../auth/presentation/auth.types'

export class ProfileMapper {
    static toResponse(profile: UserProfile): ProfileRDTO {
        return {
            id: profile.getId(),
            fullName: profile.getFullName(),
            birthDate: profile.getBirthDate(),
            phoneNumber: profile.getPhoneNumber().getValue(),
        }
    }
}
