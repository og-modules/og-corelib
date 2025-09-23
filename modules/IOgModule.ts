import type { OgSceneControlsAPI } from '../sceneControls';

export interface IFoundryExtensions {
    readonly sceneControls: OgSceneControlsAPI;
}

export interface IOgModule extends IModuleInfo, IFoundryExtensions {
    // get id(): string;
    // get name(): string;
    // get description(): string | null;
    initialize(): void;
    // init(): void;
    // i18nInit(): void;
    // setup(): void;
    // ready(): void;
    getApi<T>(): T;
    setApi<T>(api: T): void;
}

export interface IModuleInfo extends IModuleIdentification {
    get title(): string;
    get description(): string | undefined;
}

export interface IModuleIdentification {
    get id(): string;
}
