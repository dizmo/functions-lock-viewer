import { MasterIdWrapped as BaseMasterIdWrapped } from '@dizmo/functions-lock';
import { MasterId as BaseMasterId } from '@dizmo/functions-lock';
import { Lock as BaseLock } from '@dizmo/functions-lock';
import { random } from '@dizmo/functions-random';
import { agent } from '@dizmo/functions-agent';

import { Dizmo } from './types';
declare const dizmo: Dizmo;
import { Viewer } from './types';
declare const viewer: Viewer;

/**
 * Composite structure to manage identities
 */
 export interface MasterId extends BaseMasterId {
    /** dizmo identifier */
    did: string;
}
export interface MasterIdWrapped extends BaseMasterIdWrapped {
    /** master identifier */
    value: MasterId | null;
}
/**
 * Class to acquire and release locks: Each instance manages a separate lock,
 * unless they have the same (optional) `name`. Also, an (optional) `clear` flag
 * can be used to clear an existing lock (by having its corresponding internal
 * identity discarded).
 *
 * A minimal example:
 * @example
 *  ```
 *  const lock = new Lock('my-lock');
 *  // request exclusive lock
 *  if (await lock.acquire()) {
 *      // ensure it's not spurious
 *      if (await lock.acquire()) {
 *          // do something & then release it
 *          await lock.release();
 *      }
 *  }
 *  ```
 */
 export class Lock extends BaseLock {
    /**
     * Instantiates a new lock object to acquire and release locks.
     *
     * @param name
     *  optional name to access the same lock across multiple instances
     * @param clear
     *  optional flag to suspend an (existing) identity
     */
     public constructor(
        path?: string | null, clear?: boolean
    ) {
        super(path, clear); // use default storage
    }
    protected setMasterId(
        index: number, value: MasterId | null
    ): Promise<MasterId | null> {
        viewer.setProperty(this.getMasterIdPath(index), {
            value, nonce: random(8)
        });
        return new Promise<MasterId | null>((resolve) => {
            const sid = viewer.onProperty(this.getMasterIdPath(index), (
                path: string, wid: MasterIdWrapped
            ) => {
                viewer.unsubscribe(sid);
                resolve(wid.value);
            }, {}, () => {
                viewer.setProperty(this.getMasterIdPath(index), {
                    value, nonce: random(8)
                });
            });
        });
    }
    protected async getMasterId(
        index: number, force = false
    ): Promise<MasterId | null> {
        const cid = await viewer.cacheProperty(this.getMasterIdPath(index));
        const wid = viewer.getProperty(this.getMasterIdPath(index)) as MasterIdWrapped;
        viewer.uncacheProperty(cid);
        if (typeof wid === 'object' && wid?.value && !force) {
            return Promise.resolve(wid.value);
        }
        return await this.setMasterId(index, await this.newMasterId());
    }
    protected async newMasterId(): Promise<MasterId> {
        return { ...await super.newMasterId(), did: dizmo.identifier };
    }
    protected cmpMasterId(
        lhs: MasterId, rhs: MasterId
    ): boolean {
        if (lhs.did === rhs.did) {
            return super.cmpMasterId(lhs, rhs);
        }
        return false;
    }
    protected async getEphemeralId(): Promise<string> {
        if (agent(/dizmo/i)) {
            return '00000000-0000-0000-0000-000000000000';
        }
        return await super.getEphemeralId();
    }
}
export default Lock;
