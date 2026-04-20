export class AuthError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'AuthError'
    }
}

export class InvalidTokenError extends AuthError {
    constructor() {
        super('Unauthorized')
    }
}

export class InvalidRefreshTokenError extends AuthError {
    constructor() {
        super('Unauthorized')
    }
}

export class UserNotFoundError extends AuthError {
    constructor() {
        super('User not found')
    }
}
