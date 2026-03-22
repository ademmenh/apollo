export interface ISendVerificationSecretStrategy {
    handle(id: string | number): Promise<void>
}
