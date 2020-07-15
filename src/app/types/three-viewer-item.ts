import { ItemBase, LocalizedText } from './item';

// General

type ThreeViewerItemVector3 = [number, number, number];


interface ThreeViewerItemObject {
    title: LocalizedText,
    description?: LocalizedText,
    position?: ThreeViewerItemVector3,
    rotation?: ThreeViewerItemVector3,
    scale?: ThreeViewerItemVector3,
}


// Colliders
export interface ThreeViewerItemCollider extends ThreeViewerItemObject {
    geometry: string;
}

// Models

export interface ThreeViewerItemModel extends ThreeViewerItemObject {
    meshes: {
        name: string,
        file: string
    }[],
    previewImage?: string;
    activeMaterial?: number,
    materials: {
        title: LocalizedText,
        description?: LocalizedText,
        previewImage?: string,
        meshMaterials: {
            color: number,
            map?: string,
            normalMap?: string
        }[]
    }[]
}

// Lights

export type ThreeViewerItemLightType = "ambient" | "directional";

export interface ThreeViewerItemLightBase extends ThreeViewerItemObject {
    type: ThreeViewerItemLightType;
    color: number
}

export interface ThreeViewerItemAmbientLight extends ThreeViewerItemLightBase {
    type: "ambient";
}

export interface ThreeViewerItemDirectionalLight extends ThreeViewerItemLightBase {
    type: "directional";
    color: number;
    castShadow: boolean;
    shadowCameraSize: ThreeViewerItemVector3;
    shadowMapWidth: number;
    shadowMapHeight: number;
}

export type ThreeViewerItemLight = ThreeViewerItemAmbientLight | ThreeViewerItemDirectionalLight;


// Pins


export interface ThreeViewerItemPin extends ThreeViewerItemObject {
    layerIndex: number;
    href?: string;
    hrefText?: LocalizedText;
}

export interface ThreeViewerItemPinLayer {
    title: LocalizedText;
    description: LocalizedText;
    color: number;
    geometry: string;
}


// Base Item

export type ThreeViewerItemCameraControls = "orbit" | "fly";

export interface ThreeViewerItem extends ItemBase {
    type: "3d",
    camera: {
        position: ThreeViewerItemVector3,
        lookAt: ThreeViewerItemVector3,
        rotationSpeed?: number,
        zoomStep?: number,
        zoomDamping?: number,
        controls?: ThreeViewerItemCameraControls
    },
    loadingBackgroundImage?: string;
    models?: ThreeViewerItemModel[],
    lights?: ThreeViewerItemLight[],
    pinLayers?: ThreeViewerItemPinLayer[],
    pins?: ThreeViewerItemPin[],
    colliders?:ThreeViewerItemCollider[]
}
