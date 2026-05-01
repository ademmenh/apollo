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

export class InvalidCredentialsError extends AuthError {
    constructor() {
        super('Invalid credentials')
    }
}

export class UserAlreadyVerifiedError extends AuthError {
    constructor() {
        super('User already verified')
    }
}

export class CodeExpiredOrUserNotFoundError extends AuthError {
    constructor() {
        super('User not found or code expired')
    }
}

export class TooManyAttemptsError extends AuthError {
    constructor() {
        super('Too many attempts')
    }
}

export class InvalidCodeError extends AuthError {
    constructor(attemptsLeft: number) {
        super(`Invalid code. Attempts left: ${attemptsLeft}`)
    }
}

export class ResetRequestNotFoundError extends AuthError {
    constructor() {
        super('Reset request not found or expired')
    }
}
