import { IOgModule, OgBaseModule } from './modules';
import { OgSetting } from './settings';
import { Lazy } from './utils';

console.debug('og-corelib: module loading...');

// Re-export all modules
export * from './hooks';
export * from './loggers';
export * from './modules';
export * from './settings';
export * from './utils';

// Game extensions
const gameExtensionsKey = 'og';

function initializeOgExtensions() {
    console.debug('og-corelib: initializeOgExtensions');
    (globalThis as any)[gameExtensionsKey] = {};
}

function enforceOgExtensionsInitialized() {
    console.debug('og-corelib: enforceOgExtensionsInitialized');
    if ((globalThis as any)[gameExtensionsKey] === undefined) {
        initializeOgExtensions();
    }
}

function registerOgModule(moduleFactory: () => IOgModule): IOgModule {
    console.debug('og-corelib: registerOgModule');
    enforceOgExtensionsInitialized();
    const module = moduleFactory();
    console.debug('og-corelib: module id: ', module.id, module);
    (globalThis as any)[gameExtensionsKey][module.id] = {
        ...(globalThis as any)[gameExtensionsKey][module.id],
        ...module,
    };
    console.debug('og-corelib: initializing module ', module.id);
    module.initialize();
    console.debug('og-corelib: module initialized ', module.id);
    // Object.assign((globalThis.og as any)[module.id] || {}, module);
    return module;
}

export {};

export interface IOgCoreLib {
    registerModule: (moduleFactory: () => IOgModule) => IOgModule;
    Lazy: typeof Lazy;
    Setting: typeof OgSetting;
    BaseModule: typeof OgBaseModule;
}

export interface IOgGlobal extends IOgCoreLib {}

declare global {
    var og: IOgGlobal;
}

globalThis.og = window.og || {
    registerModule: registerOgModule,
    Lazy: Lazy,
    Setting: OgSetting,
    BaseModule: OgBaseModule,
};

console.debug('og-corelib: module loaded', globalThis.og);
