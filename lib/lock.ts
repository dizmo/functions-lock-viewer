import { MasterIdWrapped as BaseMasterIdWrapped } from '@dizmo/functions-lock';
import { MasterId as BaseMasterId } from '@dizmo/functions-lock';
import { Lock as BaseLock } from '@dizmo/functions-lock';
import { random } from '@dizmo/functions-random';
import { agent } from '@dizmo/functions-agent';

import { Dizmo } from './types';
declare const dizmo: Dizmo;
import { Viewer } from './types';
declare const viewer: Viewer;

export interface MasterId extends BaseMasterId {
    did: string;
}
export interface MasterIdWrapped extends BaseMasterIdWrapped {
    value: MasterId;
}
export class Lock extends BaseLock {
    public constructor(
        path?: string | null, clear?: boolean
    ) {
        super(path, clear); // storage is undefined
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
