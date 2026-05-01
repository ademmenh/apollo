import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './module'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    const configService = app.get(ConfigService)
    const port = configService.getOrThrow<string>('PORT')
    await app.listen(port)
}

bootstrap()
