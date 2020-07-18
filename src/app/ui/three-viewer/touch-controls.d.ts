import { PerspectiveCamera, Object3D } from "three";

export type TouchControlsOptions = {
    rotationSpeed: number;
    zoomDamping: number;
    zoomStep: number;
}

export declare class TouchControlBounds {
    set(...objs: Object3D[]);
}

export declare class TouchControls {
    camera: PerspectiveCamera;
    domElement: HTMLElement;
    enabled: boolean;
    
    get bounds(): TouchControlBounds;

    constructor(camera: PerspectiveCamera, domElement: HTMLElement, options?: Partial<TouchControlsOptions>);
    update():void;
    dispose(): void;

    addEventListener(evt: "change", handler: (target: TouchControls) => void);

}