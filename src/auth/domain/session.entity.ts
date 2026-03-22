import { TUserRole } from 'src/users/domain/value-objects/user-role.vo'

export class Session {
    constructor(
        public readonly userId: string,
        public readonly hashedRefreshToken: string,
        public readonly userAgent: string,
        public readonly ipAddress: string,
        public readonly role: TUserRole,
    ) {}
}
