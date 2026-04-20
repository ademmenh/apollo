import { Global, Module, OnModuleDestroy, Inject } from '@nestjs/common'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

@Global()
@Module({
    providers: [
        {
            provide: 'DRIZZLE_CLIENT',
            useFactory: () => {
                const pool = new Pool({
                    host: process.env.DB_HOST,
                    port: Number(process.env.DB_PORT),
                    user: process.env.DB_USER,
                    password: process.env.DB_PASSWORD,
                    database: process.env.DB_NAME,
                })
                return drizzle(pool)
            },
        },
    ],
    exports: ['DRIZZLE_CLIENT'],
})
export class DrizzleModule implements OnModuleDestroy {
    constructor(@Inject('DRIZZLE_CLIENT') private readonly db: NodePgDatabase) { }

    async onModuleDestroy() {
        const pool = (this.db as any)._pool as Pool
        if (pool) {
            await pool.end()
            console.log('[DrizzleModule] PostgreSQL pool closed')
        }
    }
}
