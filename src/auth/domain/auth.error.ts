export class AuthError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'AuthError'
    }
}

export class InvalidTokenError extends AuthError {
    constructor() {
        super('Invalid token')
    }
}

export class InvalidRefreshTokenError extends AuthError {
    constructor() {
        super('Invalid refresh token')
    }
}

export class SessionExpiredError extends AuthError {
    constructor() {
        super('Session expired')
    }
}

export class UserNotFoundError extends AuthError {
    constructor() {
        super('User not found')
    }
}
