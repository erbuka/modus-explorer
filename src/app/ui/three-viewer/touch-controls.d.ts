import { PerspectiveCamera } from "three";
import { NgZone } from "@angular/core";

export declare class TouchControls {
    camera: PerspectiveCamera;
    domElement: HTMLElement;
    enabled: boolean;
    rotationSpeed: number;
    zoomSpeed: number;
    wheelZoomStep: number;
    keyboardMovementSpeed: number;
    constructor(camera: PerspectiveCamera, domElement: HTMLElement);
    dispose(): void;
}