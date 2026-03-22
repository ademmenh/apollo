export interface ISendResetPasswordSecretStrategy {
    handle(id: string | number): Promise<void>
}
