import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './module'
import { DrizzleExceptionFilter } from './common/presentation/drizzle-exception-filter'
import { ResponseLoggingInterceptor } from './common/infrastructure/logger-interceptor'
import { Logger } from './common/infrastructure/logger'
import { transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { LoggerStore } from './config/infrastructure/loggers'

async function bootstrap() {
    const appLogger = new Logger([
        new DailyRotateFile({
            filename: 'logs/app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '120d',
        }),
        new transports.Console()
    ])
    const workerLogger = new Logger([
        new DailyRotateFile({
            filename: 'logs/worker-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '120d',
        }),
        new transports.Console()
    ])
    LoggerStore.app = appLogger
    LoggerStore.worker = workerLogger
    const app = await NestFactory.create(AppModule)
    app.useGlobalInterceptors(new ResponseLoggingInterceptor(appLogger.getLogger()))
    app.useGlobalFilters(new DrizzleExceptionFilter())
    const configService = app.get(ConfigService)
    const port = configService.getOrThrow<string>('PORT')
    await app.listen(port)
}

bootstrap()
