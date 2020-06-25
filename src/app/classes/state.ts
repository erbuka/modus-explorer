export type StateData = { [key: string]: any };

export abstract class State {
    abstract saveState(data: StateData): void;
    abstract getState(): StateData;
}
