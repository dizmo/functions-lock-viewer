/* eslint @typescript-eslint/no-explicit-any: [off] */
export interface Dizmo {
    identifier: string;
}
export interface Viewer {
    cacheProperty: (path: string) => Promise<string>;
    uncacheProperty: (cid: string) => void;
    setProperty: <T>(path: string, value: T) => void;
    getProperty: <T>(path: string) => T;
    onProperty: (path: string, callback: Callback, options?: any, subscribed?: Subscribed) => string;
    unsubscribe: (sid: string) => void;
}
export interface Callback extends Function {
    (path: string, value: any, old_value: any): void;
}
export interface Subscribed extends Function {
    (): void;
}
