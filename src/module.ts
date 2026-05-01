import { Global, Module, ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common'
import { join } from 'path'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ConfigModule } from './config/module'
import { ConfigService } from '@nestjs/config'
import { DrizzleModule } from './config/infrastructure/drizzle-module'
import { ValkeyModule } from './config/infrastructure/valkey-module'
import { MailModule } from './config/infrastructure/mail-module'
import { AuthModule } from './auth/module'
import { UsersModule } from './users/module'
import { OutboxModule } from './outbox/outbox.module'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { AppResolver } from './app.resolver'
import { createLoggerProvider } from './common/infrastructure/logger'
import { ResponseLoggingInterceptor } from './common/infrastructure/logger-interceptor'
import { DrizzleExceptionFilter } from './common/presentation/drizzle-exception-filter'
import { UUIDGenerator } from './common/infrastructure/uuid-generator'

@Global()
@Module({
    imports: [
        ConfigModule,
        DrizzleModule,
        ValkeyModule,
        MailModule,
        AuthModule,
        UsersModule,
        OutboxModule,
        ScheduleModule.forRoot(),
        GraphQLModule.forRootAsync<ApolloDriverConfig>({
            driver: ApolloDriver,
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const version = configService.get<string>('API_VERSION') || '0'
                return {
                    autoSchemaFile: join(process.cwd(), 'schema.gql'),
                    playground: process.env.NODE_ENV !== 'production',
                    path: `api/v${version}/graphql`,
                }
            },
            inject: [ConfigService],
        }),
    ],
    controllers: [AppController],
    providers: [
        AppResolver,
        createLoggerProvider('APP_LOGGER', 'app'),
        createLoggerProvider('WORKER_LOGGER', 'worker'),
        {
            provide: 'IDGenerator',
            useClass: UUIDGenerator,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ResponseLoggingInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ClassSerializerInterceptor,
        },
        {
            provide: APP_FILTER,
            useClass: DrizzleExceptionFilter,
        },
        {
            provide: APP_PIPE,
            useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
        },
    ],
    exports: ['APP_LOGGER', 'WORKER_LOGGER', 'IDGenerator'],
})
export class AppModule { }
