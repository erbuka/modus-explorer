import { ItemBase, ItemLink, LocalizedText } from './item';

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
    activeMaterial?: number;
    visible?: boolean;
    opacity?: number;
    transparent?: boolean,
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
    /** @deprecated */
    itemId?: string;
    itemLink?: ItemLink;
    linkText?: LocalizedText;
}

export interface ThreeViewerItemPinLayer {
    title: LocalizedText;
    description: LocalizedText;
    color: number;
    geometry: string;
    transparent?: boolean;
}


// Base Item

export type ThreeViewerOrbitControls = {
    type: "orbit",
    rotationSpeed: number,
    zoomStep: number,
    minDistance: number
    maxDistance: number
}

export type ThreeViewerFlyControls = {
    type: "fly",
    rotationSpeed: number,
    zoomStep: number,
    zoomDamping: number,
}

export interface ThreeViewerItem extends ItemBase {
    type: "3d",
    camera: {
        position: ThreeViewerItemVector3,
        lookAt: ThreeViewerItemVector3,
        controls: ThreeViewerFlyControls | ThreeViewerOrbitControls
    },
    userPopup?: {
        pageItemId: string,
    },
    layerControls?: boolean;
    loadingBackgroundImage?: string;
    models?: ThreeViewerItemModel[],
    lights?: ThreeViewerItemLight[],
    pinLayers?: ThreeViewerItemPinLayer[],
    pins?: ThreeViewerItemPin[],
    colliders?: ThreeViewerItemCollider[]
}
