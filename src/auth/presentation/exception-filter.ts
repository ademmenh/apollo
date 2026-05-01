import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import {
    AuthError,
    InvalidRefreshTokenError,
    InvalidTokenError,
    UserNotFoundError,
    InvalidCredentialsError,
    UserAlreadyVerifiedError,
    CodeExpiredOrUserNotFoundError,
    TooManyAttemptsError,
    InvalidCodeError,
    ResetRequestNotFoundError
} from '../domain/error'
import {
    InvalidEmailError,
    InvalidPhoneNumberError,
    InvalidUserIdError,
    MissingEmailError,
    MissingPhoneNumberError,
    CanNotLoginError,
    PhoneAlreadyExistsError,
    UserAlreadyExistsError,
    WeakPasswordError
} from '../../users/domain/errors'

@Catch(AuthError, WeakPasswordError, InvalidEmailError, InvalidPhoneNumberError, InvalidUserIdError, MissingEmailError, MissingPhoneNumberError, CanNotLoginError, PhoneAlreadyExistsError, UserAlreadyExistsError, HttpException, Error)
export class AuthExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        let status = HttpStatus.INTERNAL_SERVER_ERROR
        let message = 'Internal server error'

        if (exception instanceof AuthError) {
            if (exception instanceof InvalidTokenError || exception instanceof InvalidRefreshTokenError) {
                status = HttpStatus.UNAUTHORIZED
            } else if (
                exception instanceof UserNotFoundError ||
                exception instanceof CodeExpiredOrUserNotFoundError ||
                exception instanceof ResetRequestNotFoundError
            ) {
                status = HttpStatus.NOT_FOUND
            } else if (exception instanceof InvalidCredentialsError) {
                status = HttpStatus.UNAUTHORIZED
            } else if (exception instanceof UserAlreadyVerifiedError || exception instanceof InvalidCodeError) {
                status = HttpStatus.BAD_REQUEST
            } else if (exception instanceof TooManyAttemptsError) {
                status = HttpStatus.FORBIDDEN
            } else {
                status = HttpStatus.UNAUTHORIZED
            }
            message = exception.message
        } else if (
            exception instanceof WeakPasswordError ||
            exception instanceof InvalidEmailError ||
            exception instanceof InvalidPhoneNumberError ||
            exception instanceof InvalidUserIdError ||
            exception instanceof MissingEmailError ||
            exception instanceof MissingPhoneNumberError
        ) {
            status = HttpStatus.BAD_REQUEST
            message = exception.message
        } else if (exception instanceof CanNotLoginError) {
            status = HttpStatus.FORBIDDEN
            message = exception.message
        } else if (exception instanceof PhoneAlreadyExistsError || exception instanceof UserAlreadyExistsError) {
            status = HttpStatus.CONFLICT
            message = exception.message
        } else if (exception instanceof HttpException) {
            status = exception.getStatus()
            const responseObj = exception.getResponse()
            message = typeof responseObj === 'object' ? (responseObj as any).message || exception.message : responseObj
        } else {
            console.error('Unhandled Auth Error:', exception)
            message = exception.message || 'Internal server error'
        }

        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()
        response.status(status).json({
            statusCode: status,
            message,
            error: HttpStatus[status]?.replace(/_/g, ' ') || 'Error',
        })
    }
}
