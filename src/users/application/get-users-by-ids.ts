import { Inject, Injectable } from '@nestjs/common'
import type { IUserRepository } from '../domain/repository'
import { User } from '../domain/entity'

@Injectable()
export class GetUsersByIdsUseCase {
    constructor(
        @Inject('IUserRepository')
        private readonly userRepository: IUserRepository,
    ) { }

    async execute(ids: string[]): Promise<(User | null)[]> {
        const users = await this.userRepository.findByIds(ids)
        // Ensure order matches the input IDs for DataLoader
        const userMap = new Map(users.map(u => [u.getId().getValue(), u]))
        return ids.map(id => userMap.get(id) ?? null)
    }
}
