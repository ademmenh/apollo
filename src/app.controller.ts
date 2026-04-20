import { Controller, Get } from '@nestjs/common'

@Controller()
export class AppController {
    @Get('health')
    healthCheck(): { status: number; message: string; data: null } {
        return {
            status: 200,
            message: 'ok',
            data: null
        }
    }
}
