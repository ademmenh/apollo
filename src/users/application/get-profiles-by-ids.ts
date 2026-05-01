import { Inject, Injectable } from '@nestjs/common'
import type { IUserRepository } from '../domain/repository'
import { UserProfile } from '../domain/user-profile'

@Injectable()
export class GetProfilesByIdsUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    ) { }

    async execute(ids: string[]): Promise<(UserProfile | null)[]> {
        const profiles = await this.userRepository.findProfilesByIds(ids)
        const profilesMap = new Map(profiles.map(p => [p.getId(), p]))
        return ids.map(id => profilesMap.get(id) || null)
    }
}
