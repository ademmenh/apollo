import { createLogger, format, transport, transports as winstonTransports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { ConfigService } from '@nestjs/config'

export class Logger {
    private readonly logger: ReturnType<typeof createLogger>

    constructor(stratigies: transport[]) {
        this.logger = createLogger({
            level: 'info',
            format: format.combine(format.timestamp(), format.json()),
            transports: [...stratigies],
        })
    }

    public getLogger(): ReturnType<typeof createLogger> {
        return this.logger
    }

    public warn(message: string, meta?: unknown): void {
        this.logger.warn(message, meta)
    }

    public info(message: string, meta?: unknown): void {
        this.logger.info(message, meta)
    }

    public error(message: string, meta?: unknown): void {
        this.logger.error(message, meta)
    }
}

export const createLoggerProvider = (provide: string, fileName: string) => ({
    provide,
    useFactory: (config: ConfigService) => {
        const env = config.get('ENV')
        const retention = String(config.get('RETENTION_DAYS') || '120d')

        const transports: transport[] = [
            new DailyRotateFile({
                filename: `logs/${fileName}-%DATE%.log`,
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: retention.endsWith('d') ? retention : `${retention}d`,
            }),
        ]

        if (env === 'dev') {
            transports.push(new winstonTransports.Console())
        }

        return new Logger(transports)
    },
    inject: [ConfigService],
})
