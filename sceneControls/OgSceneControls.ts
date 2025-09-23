import { IModuleInfo } from '../modules';
import { LocalizableString, localize } from '../utils/LocalizableString';

export type ToolKind = 'button' | 'toggle';

export interface OgSceneControlTool {
    module: IModuleInfo; // grouping bucket (module.id); title may be used for labeling
    name: string; // unique within module
    title: LocalizableString;
    icon: string; // e.g., 'fas fa-clipboard-list'
    type?: ToolKind; // default 'button'
    order?: number; // per-module ordering (ascending)
    visible?: () => boolean; // optional visibility check
    onClick?: () => void; // for 'button'
    onToggle?: (active: boolean) => void; // for 'toggle'
    getActive?: () => boolean; // for 'toggle'
}

export interface OgSceneControlsAPI {
    registerTool(tool: OgSceneControlTool): void;
    unregisterTool(moduleId: string, name?: string): void;
    enableTool(moduleId: string, name: string): void;
    disableTool(moduleId: string, name: string): void;
    toggleTool(moduleId: string, name: string): void;
    setGroup(opts: { title?: LocalizableString; icon?: string }): void;
}

interface InternalTool {
    def: OgSceneControlTool;
    enabled: boolean; // controls visibility regardless of def.visible()
}

class SceneControlsManager implements OgSceneControlsAPI {
    private registry = new Map<string, Map<string, InternalTool>>(); // moduleId -> toolName -> tool
    private groupTitle: LocalizableString = 'Og Modules';
    private groupIcon = 'fas fa-dice';
    private hookRegistered = false;

    constructor() {
        this.ensureHook();
    }

    setGroup(opts: { title?: LocalizableString; icon?: string }): void {
        if (opts.title !== undefined) this.groupTitle = opts.title;
        if (opts.icon !== undefined) this.groupIcon = opts.icon;
        this.renderControls();
    }

    registerTool(tool: OgSceneControlTool): void {
        const moduleId = tool.module.id;
        const name = tool.name;
        const mod = this.registry.get(moduleId) ?? new Map<string, InternalTool>();
        mod.set(name, { def: tool, enabled: true });
        this.registry.set(moduleId, mod);
        this.renderControls();
    }

    unregisterTool(moduleId: string, name?: string): void {
        const mod = this.registry.get(moduleId);
        if (!mod) return;
        if (name) {
            mod.delete(name);
            if (mod.size === 0) this.registry.delete(moduleId);
        } else {
            this.registry.delete(moduleId);
        }
        this.renderControls();
    }

    enableTool(moduleId: string, name: string): void {
        const t = this.registry.get(moduleId)?.get(name);
        if (!t) return;
        t.enabled = true;
        this.renderControls();
    }

    disableTool(moduleId: string, name: string): void {
        const t = this.registry.get(moduleId)?.get(name);
        if (!t) return;
        t.enabled = false;
        this.renderControls();
    }

    toggleTool(moduleId: string, name: string): void {
        const t = this.registry.get(moduleId)?.get(name);
        if (!t) return;
        if ((t.def.type ?? 'button') === 'toggle') {
            const active = !!t.def.getActive?.();
            t.def.onToggle?.(!active);
        } else {
            t.enabled = !t.enabled;
            this.renderControls();
        }
    }

    private ensureHook(): void {
        if (this.hookRegistered) return;
        this.hookRegistered = true;
        try {
            (Hooks as any).on('getSceneControlButtons', (controls: any) => {
                if (!controls || typeof controls !== 'object') return;
                // Build a single group with all tools, grouped/sorted by moduleId
                const groupName = 'og-modules';
                const toolsRecord: Record<string, any> = {};

                // Sort modules alphabetically for stability
                const moduleIds = Array.from(this.registry.keys()).sort((a, b) => a.localeCompare(b));
                let moduleIndex = 0;
                for (const moduleId of moduleIds) {
                    const mod = this.registry.get(moduleId)!;
                    // Filter visible+enabled
                    const items = Array.from(mod.values()).filter((t) => t.enabled && (t.def.visible ? t.def.visible() : true));
                    if (items.length === 0) {
                        moduleIndex++;
                        continue;
                    }
                    // Sort by order within module
                    items.sort((a, b) => (a.def.order ?? 0) - (b.def.order ?? 0));
                    for (const it of items) {
                        const key = `${moduleId}__${it.def.name}`;
                        const isToggle = (it.def.type ?? 'button') === 'toggle';
                        toolsRecord[key] = {
                            name: key,
                            title: localize(it.def.title),
                            icon: it.def.icon,
                            ...(isToggle
                                ? { toggle: true, active: !!it.def.getActive?.(), onClick: () => it.def.onToggle?.(!it.def.getActive?.()) }
                                : { button: true, onClick: () => it.def.onClick?.() }),
                            cssClass: `og-tool og-m-${moduleId} og-t-${it.def.name}`,
                            // order across modules: keep module bucket order by adding stride
                            order: moduleIndex * 1000 + (it.def.order ?? 0),
                        };
                    }
                    moduleIndex++;
                }

                (controls as any)[groupName] = {
                    name: groupName,
                    title: localize(this.groupTitle),
                    icon: this.groupIcon,
                    layer: 'tiles',
                    tools: toolsRecord,
                };
            });

            // Ensure initial render on first load
            try {
                (ui as any)?.controls?.render?.(true);
            } catch {}
        } catch (e) {
            console.error('OgSceneControls: failed to register hook', e);
        }
    }

    private renderControls(): void {
        try {
            (ui as any)?.controls?.render?.(true);
        } catch {}
    }
}

let singleton: SceneControlsManager | null = null;
export function getOgSceneControls(): OgSceneControlsAPI {
    if (!singleton) singleton = new SceneControlsManager();
    return singleton;
}
