import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { IUserRepository } from '../../users/domain/user-repository.interface'
import type { IPasswordHasher } from '../domain/password-hasher.interface'
import { Password } from '../../users/domain/value-objects/password.vo'

@Injectable()
export class ChangePasswordUseCase {
    constructor(
        @Inject('IUserRepository') private readonly userRepository: IUserRepository,
        @Inject('IPasswordHasher') private readonly passwordHasher: IPasswordHasher,
    ) { }

    async execute(id: string, oldPasswordRaw: string, newPasswordRaw: string): Promise<void> {
        const user = await this.userRepository.findById(id)
        if (!user) throw new NotFoundException('User not found')
        const isMatch = await user.getPassword().compare(oldPasswordRaw, this.passwordHasher)
        if (!isMatch) throw new BadRequestException('Invalid old password')
        const newPassword = await Password.create(newPasswordRaw, this.passwordHasher)
        user.changePassword(newPassword)
        await this.userRepository.update(user)
    }
}
