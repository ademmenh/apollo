import { Injectable, Scope } from '@nestjs/common'
import DataLoader from 'dataloader'
import { ProfileRDTO } from '../../auth/presentation/auth.types'
import { GetProfilesByIdsUseCase } from '../application/get-profiles-by-ids'

@Injectable({ scope: Scope.REQUEST })
export class ProfileDataLoader {
    public readonly loader: DataLoader<string, ProfileRDTO | null>

    constructor(
        private readonly getProfilesByIds: GetProfilesByIdsUseCase,
    ) {
        this.loader = new DataLoader<string, ProfileRDTO | null>(
            async (userIds: string[]) => {
                const profiles = await this.getProfilesByIds.execute(userIds)
                return profiles.map(p => {
                    if (!p) return null
                    return {
                        id: p.getId(),
                        fullName: p.getFullName(),
                        birthDate: p.getBirthDate(),
                        phoneNumber: p.getPhoneNumber()?.getValue() ?? null,
                    }
                })
            }
        )
    }
}
