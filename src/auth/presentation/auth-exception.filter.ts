import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import { GqlContextType } from '@nestjs/graphql'
import { Response } from 'express'
import { AuthError, InvalidRefreshTokenError, InvalidTokenError, SessionExpiredError, UserNotFoundError } from '../domain/auth.error'
import { InvalidEmailError, InvalidPhoneNumberError, InvalidUserIdError, MissingEmailError, MissingPhoneNumberError, CanNotLoginError, PhoneAlreadyExistsError, UserAlreadyExistsError, WeakPasswordError } from '../../users/domain/user.errors'

@Catch()
export class AuthExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        let status = HttpStatus.INTERNAL_SERVER_ERROR
        let message = 'Internal server error'

        if (exception instanceof AuthError) {
            if (exception instanceof InvalidTokenError || exception instanceof InvalidRefreshTokenError || exception instanceof SessionExpiredError) {
                status = HttpStatus.UNAUTHORIZED
            } else if (exception instanceof UserNotFoundError) {
                status = HttpStatus.NOT_FOUND
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

        // GraphQL: re-throw as HttpException so NestJS GraphQL formats it into errors[]
        if (host.getType<GqlContextType>() === 'graphql') {
            throw new HttpException(message, status)
        }

        // REST fallback (e.g. health check controller)
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()
        response.status(status).json({
            statusCode: status,
            message,
            error: HttpStatus[status]?.replace(/_/g, ' ') || 'Error',
        })
    }
}
