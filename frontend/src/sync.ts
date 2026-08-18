export type SyncEventType = 
    | "AUTH_CHANGED"
    | "USER_UPDATED"
    | "NOTIFICATIONS_CHANGED"
    | "THEME_CHANGED"
    | "TEAM_CHANGED"
    | "PROJECT_CHANGED"
    | "TASK_CHANGED";

export interface SyncEvent {
    type: SyncEventType;
    payload?: unknown;
}

const channel = new BroadcastChannel("teamtime-sync");

type Listener = (event: SyncEvent) => void;
const listeners = new Set<Listener>();

channel.onmessage = (messageEvent: MessageEvent<SyncEvent>) => {
    listeners.forEach(listener => listener(messageEvent.data));
};

export function subscribeToSync(listener: Listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function broadcastSyncEvent(type: SyncEventType, payload?: unknown) {
    channel.postMessage({ type, payload });
}

export function testSimulateRemoteEvent(event: SyncEvent) {
    listeners.forEach(listener => listener(event));
}
