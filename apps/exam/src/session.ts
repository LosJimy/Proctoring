import { DEMO_SESSION_KEY, DEMO_SESSION_VALUE } from "./data/demo";

export function hasDemoSession(): boolean {
    return sessionStorage.getItem(DEMO_SESSION_KEY) === DEMO_SESSION_VALUE;
}

export function saveDemoSession(): void {
    sessionStorage.setItem(DEMO_SESSION_KEY, DEMO_SESSION_VALUE);
}

export function clearDemoSession(): void {
    sessionStorage.removeItem(DEMO_SESSION_KEY);
}
