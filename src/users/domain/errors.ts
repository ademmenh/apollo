export class InvalidEmailError extends Error {
    constructor(email: string) {
        super(`Invalid email format: ${email}`)
        this.name = 'InvalidEmailError'
    }
}

export class WeakPasswordError extends Error {
    constructor(reason: string) {
        super(`Weak password: ${reason}`)
        this.name = 'WeakPasswordError'
    }
}

export class CanNotLoginError extends Error {
    constructor(userId: string) {
        super(`User ${userId} can not login.`)
        this.name = 'CanNotLoginError'
    }
}

export class InvalidPhoneNumberError extends Error {
    constructor(phoneNumber: string) {
        super(`Invalid phone number format: ${phoneNumber}`)
        this.name = 'InvalidPhoneNumberError'
    }
}

export class MissingPhoneNumberError extends Error {
    constructor() {
        super('Phone number is required for this user role')
        this.name = 'MissingPhoneNumberError'
    }
}

export class InvalidUserIdError extends Error {
    constructor(userId: string) {
        super(`Invalid user ID format: ${userId}`)
        this.name = 'InvalidUserIdError'
    }
}

export class UserAlreadyExistsError extends Error {
    constructor(email: string) {
        super(`User with email ${email} already exists`)
        this.name = 'UserAlreadyExistsError'
    }
}

export class PhoneAlreadyExistsError extends Error {
    constructor(phone: string) {
        super(`User with phone ${phone} already exists or is pending verification`)
        this.name = 'PhoneAlreadyExistsError'
    }
}

export class MissingEmailError extends Error {
    constructor() {
        super('Email is required')
        this.name = 'MissingEmailError'
    }
}

export class ProfileNotFoundError extends Error {
    constructor(userId: string) {
        super(`Profile not found for user ${userId}`)
        this.name = 'ProfileNotFoundError'
    }
}
