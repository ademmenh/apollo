import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GlideClient } from '@valkey/valkey-glide'

@Global()
@Module({
    providers: [
        {
            provide: 'VALKEY_CLIENT',
            useFactory: async (configService: ConfigService) => {
                const host = configService.getOrThrow<string>('CACHE_HOST')
                const port = Number(configService.getOrThrow<string>('CACHE_PORT'))
                const password = configService.getOrThrow<string>('CACHE_PASSWORD')
                const tls = configService.getOrThrow<string>('CACHE_TLS') === 'true'
                return await GlideClient.createClient({
                    addresses: [{ host, port }],
                    useTLS: tls,
                    credentials: {
                        password,
                    },
                })
            },
            inject: [ConfigService],
        },
    ],
    exports: ['VALKEY_CLIENT'],
})
export class ValkeyModule implements OnModuleDestroy {
    constructor(@Inject('VALKEY_CLIENT') private readonly client: GlideClient) { }

    async onModuleDestroy() {
        if (this.client) {
            this.client.close()
        }
    }
}
