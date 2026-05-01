import { getSchemaPath } from '@nestjs/swagger'

export const getResponseSchema = (dto: any, message: string, statusCode: number = 200) => ({
    type: 'object',
    properties: {
        statusCode: { type: 'number', example: statusCode },
        message: { type: 'string', example: message },
        data: dto ? { $ref: getSchemaPath(dto) } : { type: 'object', nullable: true, example: null },
    },
})
