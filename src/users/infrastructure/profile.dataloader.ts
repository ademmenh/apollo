import { Inject, Injectable, Scope } from '@nestjs/common'
import DataLoader from 'dataloader'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { inArray } from 'drizzle-orm'
import { profilesTable } from './schema'
import { ProfileRDTO } from '../../auth/presentation/auth.types'

@Injectable({ scope: Scope.REQUEST })
export class ProfileDataLoader {
    public readonly loader: DataLoader<string, ProfileRDTO>

    constructor(
        @Inject('DRIZZLE_CLIENT') private readonly db: NodePgDatabase,
    ) {
        this.loader = new DataLoader<string, ProfileRDTO>(
            async (userIds: string[]) => {
                const profiles = await this.db.select()
                    .from(profilesTable)
                    .where(inArray(profilesTable.id, userIds))

                const profilesMap = new Map()
                profiles.forEach(p => {
                    profilesMap.set(p.id, {
                        id: p.id,
                        fullName: p.fullName,
                        birthDate: p.birthDate,
                        phoneNumber: p.phoneNumber,
                    })
                })

                return userIds.map(id => profilesMap.get(id) || null)
            }
        )
    }
}
