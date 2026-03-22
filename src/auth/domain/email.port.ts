export interface IEmailPort {
    sendVerificationEmail(to: string, name: string, code: string): Promise<void>
    sendPasswordResetEmail(to: string, name: string, code: string): Promise<void>
}
