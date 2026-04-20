import { ArgumentsHost, Catch } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class DrizzleExceptionFilter implements GqlExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        if (exception.code === '23505') throw new GraphQLError('Duplicate entry', { extensions: { code: 'CONFLICT' } });
        return exception;
    }
}