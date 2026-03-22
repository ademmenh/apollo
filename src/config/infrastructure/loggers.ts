import { Logger } from '../../common/presentation/logger'

export class LoggerStore {
    static app: Logger
    static worker: Logger

    static getApp() {
        if (!this.app) throw new Error('App Logger not initialized!');
        return this.app
    }

    static getWorker() {
        if (!this.worker) throw new Error('Worker Logger not initialized!');
        return this.worker
    }
}