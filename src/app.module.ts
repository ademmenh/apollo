import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { ConfigModule } from './config/config.module'
import { DrizzleModule } from './config/infrastructure/drizzle.module'
import { ValkeyModule } from './config/infrastructure/valkey.module'
import { MailModule } from './config/infrastructure/mail.module'
import { AuthModule } from './auth/auth.module'
import { AppController } from './app.controller'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
    imports: [
        ConfigModule,
        DrizzleModule,
        ValkeyModule,
        MailModule,
        AuthModule,
        ScheduleModule.forRoot(),
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            autoSchemaFile: true,
            playground: process.env.NODE_ENV !== 'production',
        }),
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule { }
