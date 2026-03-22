import { ISessionRepository } from '../../domain/session-repository.interface'
import { Session } from '../../domain/session.entity'

export class InMemorySessionRepository implements ISessionRepository {
    private sessions: Map<string, Session> = new Map()
    private userSessions: Map<string, Set<string>> = new Map()

    async save(session: Session): Promise<void> {
        this.sessions.set(session.hashedRefreshToken, session)

        if (!this.userSessions.has(session.userId)) {
            this.userSessions.set(session.userId, new Set())
        }
        this.userSessions.get(session.userId)!.add(session.hashedRefreshToken)
    }

    async findByHash(hash: string): Promise<Session | null> {
        return this.sessions.get(hash) || null
    }

    async findAllByUserId(userId: string): Promise<Session[]> {
        const hashes = this.userSessions.get(userId)
        if (!hashes) return []

        const result: Session[] = []
        for (const hash of hashes) {
            const session = this.sessions.get(hash)
            if (session) result.push(session)
        }
        return result
    }

    async deleteByHash(hash: string): Promise<void> {
        const session = this.sessions.get(hash)
        if (session) {
            this.userSessions.get(session.userId)?.delete(hash)
            this.sessions.delete(hash)
        }
    }

    async deleteByUserId(userId: string): Promise<void> {
        const hashes = this.userSessions.get(userId)
        if (hashes) {
            for (const hash of hashes) {
                this.sessions.delete(hash)
            }
            this.userSessions.delete(userId)
        }
    }

    async rotate(oldHash: string, newSession: Session): Promise<void> {
        await this.deleteByHash(oldHash)
        await this.save(newSession)
    }
}
