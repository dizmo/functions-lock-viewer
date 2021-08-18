/* eslint @typescript-eslint/no-explicit-any: [off] */
export type Global = Record<string, any>;
declare const global: Global;

import { Viewer, Dizmo } from '../lib/types';
import { Subscribed } from '../lib/types';
import { Callback } from '../lib/types';
import { Lock } from '../lib/lock';

import { random } from '@dizmo/functions-random';
import { expect } from 'chai';

describe('Lock', () => {
    it('should exist', () => {
        expect(Lock).to.not.be.an('undefined');
    });
    it('should be a function', () => {
        expect(Lock).to.be.a('function');
    });
});
describe('Lock', () => {
    class DizmoMock implements Dizmo {
        identifier = random(16);
    }
    class ViewerMock implements Viewer {
        cacheProperty(path: string): Promise<string> {
            const cid = random(8);
            this.caches[cid] = path;
            return Promise.resolve(cid);
        }
        uncacheProperty(cid: string): void {
            delete this.caches[cid];
        }
        setProperty<T>(path: string, value: T): void {
            const callback = this.callbacks[path];
            if (typeof callback === 'function') setTimeout(() => {
                callback.call(this, path, value, this.properties[path]);
            });
            this.properties[path] = value;
        }
        getProperty<T>(path: string): T {
            return this.properties[path] as T;
        }
        onProperty(
            path: string,
            callback: Callback,
            options?: any,
            subscribed?: Subscribed
        ): string {
            const sid = random(8);
            this.subscriptions[sid] = path;
            this.callbacks[path] = callback;
            if (typeof subscribed === 'function') {
                subscribed();
            }
            return sid;
        }
        unsubscribe(sid: string): void {
            const path = this.subscriptions[sid];
            delete this.subscriptions[sid];
            delete this.callbacks[path];
        }
        caches: Record<string, string> = {};
        properties: Record<string, any> = {};
        callbacks: Record<string, Callback> = {}
        subscriptions: Record<string, string> = {};
    }
    beforeEach(() => {
        global.dizmo = new DizmoMock();
        global.viewer = new ViewerMock();
    });
    afterEach(() => {
        delete global.dizmo;
        delete global.viewer;
    });
    suite();
});
function suite() {
    it('should acquire anonymous locks', async () => {
        const lock1 = new Lock();
        const locked1 = await lock1.acquire();
        expect(locked1).to.be.greaterThan(0);
        const lock2 = new Lock(null, true);
        const locked2 = await lock2.acquire();
        expect(locked2).to.be.greaterThan(0);
    });
    it('should release anonymous locks', async () => {
        const lock1 = new Lock();
        const unlocked1 = await lock1.release();
        expect(unlocked1).to.be.true;
        const lock2 = new Lock(null, true);
        const unlocked2 = await lock2.release();
        expect(unlocked2).to.be.true;
    });
    it('should acquire & release named lock', async () => {
        const lock = new Lock('my-lock');
        const locked = await lock.acquire();
        expect(locked).to.be.greaterThan(0);
        const unlocked = await lock.release();
        expect(unlocked).to.be.true;
    });
    it('should acquire named lock twice', async () => {
        const lock = new Lock('my-lock');
        const locked1 = await lock.acquire();
        expect(locked1).to.be.greaterThan(0);
        const locked2 = await lock.acquire();
        expect(locked2).to.be.greaterThan(0);
        const unlocked = await lock.release();
        expect(unlocked).to.be.true;
    });
    it('should release named lock twice', async () => {
        const lock = new Lock('my-lock');
        const locked1 = await lock.acquire();
        expect(locked1).to.be.greaterThan(0);
        const unlocked1 = await lock.release();
        expect(unlocked1).to.be.true;
        const unlocked2 = await lock.release();
        expect(unlocked2).to.be.true;
    });
    it('should acquire 2 named locks on same path & same id: yay (#0)', async () => {
        const lock1 = new Lock('my-lock');
        const locked1 = await lock1.acquire();
        expect(locked1).to.be.greaterThan(0);
        // *keep* old id:
        const lock2 = new Lock('my-lock');
        const locked2a = await lock2.acquire();
        expect(locked2a).to.be.greaterThan(0); // correct
        const locked1b = await lock1.acquire();
        expect(locked1b).to.be.greaterThan(0); // correct
        const unlocked1a = await lock1.release();
        expect(unlocked1a).to.be.true;
        // check aquire & release sequences:
        const locked1c = await lock1.acquire();
        expect(locked1c).to.be.greaterThan(0);
        const unlocked1c = await lock1.release();
        expect(unlocked1c).to.be.true;
        const locked2b = await lock2.acquire();
        expect(locked2b).to.be.greaterThan(0);
        const unlocked2b = await lock2.release();
        expect(unlocked2b).to.be.true;
    });
    it('should acquire 2 named locks on same path & diff id: nay (#1)', async () => {
        const lock1 = new Lock('my-lock');
        const locked1a = await lock1.acquire();
        expect(locked1a).to.be.greaterThan(0);
        // *clear* old id:
        const lock2 = new Lock('my-lock', true);
        const locked2a = await lock2.acquire();
        expect(locked2a).to.eq(null); // correct!
        const locked1b = await lock1.acquire();
        expect(locked1b).to.eq(null); // correct!
        const unlocked1a = await lock1.release();
        expect(unlocked1a).to.be.true;
        // check aquire & release sequences:
        const locked1c = await lock1.acquire();
        expect(locked1c).to.be.greaterThan(0);
        const unlocked1c = await lock1.release();
        expect(unlocked1c).to.be.true;
        const locked2b = await lock2.acquire();
        expect(locked2b).to.be.greaterThan(0);
        const unlocked2b = await lock2.release();
        expect(unlocked2b).to.be.true;
    });
    it('should acquire 2 named locks on diff path & same id: yay (#2)', async () => {
        const lock1 = new Lock('my-lock');
        const locked1 = await lock1.acquire(1);
        expect(locked1).to.be.greaterThan(0);
        // *keep* old id:
        const lock2 = new Lock('my-lock');
        const locked2a = await lock2.acquire(2);
        expect(locked2a).to.be.greaterThan(0); // correct
        const locked1b = await lock1.acquire();
        expect(locked1b).to.be.greaterThan(0); // correct
        const unlocked1a = await lock1.release();
        expect(unlocked1a).to.be.true;
        // check aquire & release sequences:
        const locked1c = await lock1.acquire();
        expect(locked1c).to.be.greaterThan(0);
        const unlocked1c = await lock1.release();
        expect(unlocked1c).to.be.true;
        const locked2b = await lock2.acquire();
        expect(locked2b).to.be.greaterThan(0);
        const unlocked2b = await lock2.release();
        expect(unlocked2b).to.be.true;
    });
    it('should acquire 2 named locks on diff path & diff id: yay (#3)', async () => {
        const lock1 = new Lock('my-lock');
        const locked1 = await lock1.acquire(1);
        expect(locked1).to.be.greaterThan(0);
        // *clear* old id:
        const lock2 = new Lock('my-lock', true);
        const locked2a = await lock2.acquire(2);
        expect(locked2a).to.be.greaterThan(0); // correct
        const locked1b = await lock1.acquire(1);
        expect(locked1b).to.eq(null); // correct!
        const unlocked1a = await lock1.release(1);
        expect(unlocked1a).to.be.true;
        // check aquire & release sequences:
        const locked1c = await lock1.acquire(1);
        expect(locked1c).to.be.greaterThan(0);
        const unlocked1c = await lock1.release(1);
        expect(unlocked1c).to.be.true;
        const locked2b = await lock2.acquire(2);
        expect(locked2b).to.be.greaterThan(0);
        const unlocked2b = await lock2.release(2);
        expect(unlocked2b).to.be.true;
    });
}
