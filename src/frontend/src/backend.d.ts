import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Participant {
    name: string;
    dates: Array<string>;
}
export interface backendInterface {
    getAllParticipants(): Promise<Array<Participant>>;
    getSortedParticipantsByAvailability(): Promise<Array<Participant>>;
    updateAvailability(name: string, dates: Array<string>): Promise<void>;
}
