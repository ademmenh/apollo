import { Controller, Get } from '@nestjs/common'

@Controller()
export class AppController {
    @Get('health')
    healthCheck(): string {
        return 'ok'
    }
}
