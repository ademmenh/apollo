import { applyDecorators } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiResponseOptions } from '@nestjs/swagger'

const defaults: ApiResponseOptions[] = [
    {
        status: 401,
        description: 'Unauthorized',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 401 },
                message: { type: 'string', example: 'Authentication failed' },
                error: { type: 'string', example: 'Unauthorized' },
            },
        },
    },
    {
        status: 403,
        description: 'Forbidden',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 403 },
                message: { type: 'string', example: 'Forbidden resource' },
                error: { type: 'string', example: 'Forbidden' },
            },
        },
    },
    {
        status: 500,
        description: 'Internal Server Error',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 500 },
                message: { type: 'string', example: 'Internal server error' },
            },
        },
    },
]

export const ApiDocs = (params: ApiResponseOptions[], security: string | boolean = false): MethodDecorator => {
    const decorators = [
        ...params.map((p) => ApiResponse(p)),
        ...defaults.map((d) => ApiResponse(d)),
    ]

    if (security) decorators.push(ApiBearerAuth(typeof security === 'string' ? security : 'access-token'))

    return applyDecorators(...decorators)
}
