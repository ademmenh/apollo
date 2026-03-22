import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class DrizzleExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()

        // Postgres duplicate key error code
        if (exception.code === '23505') {
            const detail = exception.detail
            const message = detail ? this.formatDuplicateKeyMessage(detail) : 'Duplicate entry'

            return response.status(HttpStatus.CONFLICT).json({
                statusCode: HttpStatus.CONFLICT,
                message: message,
                error: 'Conflict',
            })
        }

        // Fallback for other errors (they will be handled by Nest's default or other filters)
        // If it's already a Nest HTTP exception, let it pass through
        if (exception.getStatus && typeof exception.getStatus === 'function') {
            const status = exception.getStatus()
            return response.status(status).json(exception.getResponse())
        }

        // For other unhandled errors, return 500
        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
        })
    }

    private formatDuplicateKeyMessage(detail: string): string {
        // detail: Key (email)=(test@gmail.com) already exists.
        const match = detail.match(/\((.*)\)=\((.*)\)/)
        if (match) {
            const field = match[1]
            const value = match[2]
            return `The ${field} '${value}' already exists.`
        }
        return 'Duplicate entry'
    }
}
