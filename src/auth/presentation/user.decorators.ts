import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'

export const UserD = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const gqlCtx = GqlExecutionContext.create(ctx)
    return gqlCtx.getContext().req.user
})

export interface RequestData {
    ip: string
    userAgent: string
}

export const RequestDataD = createParamDecorator((data: unknown, ctx: ExecutionContext): RequestData => {
    const gqlCtx = GqlExecutionContext.create(ctx)
    const req = gqlCtx.getContext().req
    return {
        ip: req.ip ?? '::1',
        userAgent: (req.headers['user-agent'] as string) ?? '',
    }
})
