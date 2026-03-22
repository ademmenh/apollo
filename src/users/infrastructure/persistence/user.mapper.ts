import { User } from '../../domain/user.aggregate'
import { UserId } from '../../domain/value-objects/user-id.vo'
import { Email } from '../../domain/value-objects/email.vo'
import { Password } from '../../domain/value-objects/password.vo'
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo'
import { usersTable } from './schema'
import { InferSelectModel } from 'drizzle-orm'
import { TUserRole } from '../../domain/value-objects/user-role.vo'

export class UserMapper {
    static toDomain(raw: InferSelectModel<typeof usersTable>): User {
        const id = UserId.create(raw.id)
        const email = raw.email ? Email.create(raw.email) : null
        const password = Password.fromHash(raw.password)
        const role = raw.role as TUserRole
        const phoneNumber = PhoneNumber.create(raw.phoneNumber)

        return User.reconstruct(id, email, password, role, phoneNumber, raw.fullName, raw.birthDate, raw.isBanned, raw.createdAt, raw.deletedAt)
    }

    static toPersistence(user: User) {
        return {
            id: user.getId().getValue(),
            fullName: user.getFullName(),
            email: user.getEmail()?.getValue() || null,
            password: user.getPassword().getHash(),
            birthDate: user.getBirthDate(),
            role: user.getRole(),
            phoneNumber: user.getPhoneNumber().getValue(),
            isBanned: user.isUserBanned(),
            createdAt: user.getCreatedAt(),
            deletedAt: user.getDeletedAt(),
        }
    }
}
