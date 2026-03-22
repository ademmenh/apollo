import { Session } from './session.entity'

export interface ISessionRepository {
    save(session: Session): Promise<void>
    findByHash(hash: string): Promise<Session | null>
    findAllByUserId(userId: string): Promise<Session[]>
    deleteByHash(hash: string): Promise<void>
    deleteByUserId(userId: string): Promise<void>
    rotate(oldHash: string, newSession: Session): Promise<void>
}
