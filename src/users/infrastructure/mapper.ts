import { User, type TUserRole } from '../domain/entity'
import { UserId } from '../domain/userId'
import { Email } from '../domain/email'
import { Password } from '../domain/password'
import { PhoneNumber } from '../domain/phone-number'
import { usersTable, profilesTable } from './schema'
import { InferSelectModel } from 'drizzle-orm'

export class UserMapper {
    static toDomain(
        userRaw: InferSelectModel<typeof usersTable>,
        profileRaw: InferSelectModel<typeof profilesTable>
    ): User {
        const id = UserId.create(userRaw.id)
        const email = userRaw.email ? Email.create(userRaw.email) : null
        const password = Password.fromHash(userRaw.password)
        const role = userRaw.role as TUserRole
        const phoneNumber = PhoneNumber.create(profileRaw.phoneNumber)

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
                phoneNumber: profile.getPhoneNumber().getValue(),
            }
        }
    }
}
