import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common'
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { Logger } from './logger'

@Injectable()
export class ResponseLoggingInterceptor implements NestInterceptor {
    constructor(@Inject('APP_LOGGER') private readonly logger: Logger) { }

    private getClientIp(request: any): string {
        if (!request) return 'unknown'
        return (
            request.ip ||
            request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
            request.connection?.remoteAddress ||
            request.socket?.remoteAddress ||
            'unknown'
        )
    }

    private getRequest(context: ExecutionContext): any {
        if (context.getType<GqlContextType>() === 'graphql') {
            return GqlExecutionContext.create(context).getContext().req
        }
        return context.switchToHttp().getRequest()
    }

    private getResponse(context: ExecutionContext): any {
        if (context.getType<GqlContextType>() === 'graphql') {
            return GqlExecutionContext.create(context).getContext().req?.res
        }
        return context.switchToHttp().getResponse()
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const now = Date.now()
        const request = this.getRequest(context)
        const clientIp = this.getClientIp(request)

        return next.handle().pipe(
            tap({
                next: () => {
                    const response = this.getResponse(context)
                    const duration = Date.now() - now

                    this.logger.info('', {
                        ip: clientIp,
                        method: request?.method,
                        url: request?.url,
                        statusCode: response?.statusCode,
                        duration: `${duration}ms`,
                        userAgent: request?.headers?.['user-agent'],
                    })
                },

                error: (error) => {
                    const response = this.getResponse(context)
                    const duration = Date.now() - now

                    this.logger.error('Request failed', {
                        ip: clientIp,
                        method: request?.method,
                        url: request?.url,
                        statusCode: error.status || response?.statusCode || 500,
                        duration: `${duration}ms`,
                        userAgent: request?.headers?.['user-agent'],
                        error: error.message,
                        stack: error.stack,
                    })
                },
            }),
        )
    }
}
