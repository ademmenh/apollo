import { createLogger, format, transport } from 'winston'

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
}
