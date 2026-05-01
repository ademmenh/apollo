import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './module'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    const configService = app.get(ConfigService)
    const version = configService.getOrThrow<string>('API_VERSION')
    app.setGlobalPrefix(`api/v${version}`)
    const port = configService.getOrThrow<string>('PORT')
    const swaggerConfig = new DocumentBuilder()
        .setTitle('Waslini API')
        .setDescription('Waslini API Swagger documentation')
        .setVersion(version)
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter Access Token',
            },
            'access-token',
        )
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter Refresh Token',
            },
            'refresh-token',
        )
        .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup(`api/v${version}/docs`, app, document)
    await app.listen(port)
}

bootstrap()
