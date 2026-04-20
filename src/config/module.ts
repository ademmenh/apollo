import { Module, Global } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import * as Joi from 'joi'
import { LoggerStore } from './infrastructure/loggers'

@Global()
@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                ENV: Joi.string().valid('dev', 'prod', 'test').required(),
                APP_NAME: Joi.string().required(),
                API_VERSION: Joi.number().default(0),
                PORT: Joi.number().default(4000),

                DB_HOST: Joi.string().required(),
                DB_PORT: Joi.number().default(5432),
                DB_USER: Joi.string().required(),
                DB_PASSWORD: Joi.string().required(),
                DB_NAME: Joi.string().required(),

                LOGS_DIRNAME: Joi.string().default('logs'),
                RENTENTION_DAYS: Joi.number().default(30),

                JWT_ACCESS_TOKEN_SECRET: Joi.string().required(),
                JWT_REFRESH_TOKEN_SECRET: Joi.string().required(),
                JWT_ACCESS_TOKEN_EXPIRY: Joi.number().required(),
                JWT_REFRESH_TOKEN_EXPIRY: Joi.number().required(),
                JWT_ALGO: Joi.string().valid('HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512', 'none').required(),

                COOKIES_SECURE: Joi.boolean().default(true),
                COOKIES_SAME_SITE: Joi.string().valid('strict', 'lax', 'none').default('strict'),

                EMAIL_HOST: Joi.string().required(),
                EMAIL_PORT: Joi.number().default(465),
                EMAIL_SECURE: Joi.boolean().default(true),
                EMAIL_USER: Joi.string().required(),
                EMAIL_PASSWORD: Joi.string().required(),

                CACHE_HOST: Joi.string().required(),
                CACHE_PORT: Joi.number().default(6379),
                CACHE_USERNAME: Joi.string().allow('').optional(),
                CACHE_PASSWORD: Joi.string().allow('').optional(),
                CACHE_DB: Joi.number().default(0),
                CACHE_TLS: Joi.boolean().default(false),
                CACHE_CONN_TIMEOUT: Joi.number().default(10000),
                CACHE_TTL: Joi.number().default(60),
            }),
        }),
    ],
    providers: [
        {
            provide: 'WORKER_LOGGER',
            useFactory: () => LoggerStore.getWorker(),
        },
        {
            provide: 'APP_LOGGER',
            useFactory: () => LoggerStore.getApp(),
        }
    ],
    exports: ['WORKER_LOGGER'],
})
export class ConfigModule { }
