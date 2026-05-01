import { User, type TUserRole } from '../domain/entity'
import { UserProfile } from '../domain/user-profile'
import { UserId } from '../domain/userId'
import { Email } from '../domain/email'
import { Password } from '../domain/password'
import { PhoneNumber } from '../domain/phone-number'
import { usersTable, profilesTable } from './schema'
import { InferSelectModel } from 'drizzle-orm'
import { UserProfileRDTO } from '../../auth/presentation/dtos/response.dto'
import { plainToInstance } from 'class-transformer'

export class UserMapper {
    static toDomain(
        userRaw: InferSelectModel<typeof usersTable>,
        profileRaw: InferSelectModel<typeof profilesTable>
    ): User {
        const id = UserId.create(userRaw.id)
        const email = userRaw.email ? Email.create(userRaw.email) : null
        const password = Password.fromHash(userRaw.password)
        const role = userRaw.role as TUserRole
        const phoneNumber = profileRaw.phoneNumber ? PhoneNumber.create(profileRaw.phoneNumber) : null

        return User.reconstruct(
            id,
            email,
            password,
            role,
            phoneNumber,
            profileRaw.fullName,
            profileRaw.birthDate,
            userRaw.isBanned,
            userRaw.createdAt,
            userRaw.deletedAt
        )
    }

    static toPersistence(user: User) {
        const profile = user.getProfile()
        return {
            usersTable: {
                id: user.getId().getValue(),
                email: user.getEmail()?.getValue() || null,
                password: user.getPassword().getHash(),
                role: user.getRole(),
                isBanned: user.isUserBanned(),
                createdAt: user.getCreatedAt(),
                deletedAt: user.getDeletedAt(),
            },
            profilesTable: {
                id: user.getId().getValue(),
                fullName: profile.getFullName(),
                birthDate: profile.getBirthDate(),
                phoneNumber: profile.getPhoneNumber()?.getValue() || null,
            }
        }
    }
    static toProfileDomain(profileRaw: InferSelectModel<typeof profilesTable>): UserProfile {
        return UserProfile.reconstruct(
            profileRaw.id,
            profileRaw.fullName,
            profileRaw.birthDate,
            profileRaw.phoneNumber ? PhoneNumber.create(profileRaw.phoneNumber) : null
        )
    }

    static toResponse(user: User): UserProfileRDTO {
        const profile = user.getProfile()
        return plainToInstance(UserProfileRDTO, {
            id: user.getId().getValue(),
            email: user.getEmail()?.getValue() || null,
            fullName: profile.getFullName(),
            birthDate: profile.getBirthDate(),
            phoneNumber: profile.getPhoneNumber()?.getValue() || null,
            role: user.getRole(),
            photoUrl: null,
            createdAt: user.getCreatedAt(),
        })
    }
}
