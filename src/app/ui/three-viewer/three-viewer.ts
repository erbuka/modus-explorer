import { BufferGeometry, Mesh, Float32BufferAttribute, Group, MeshStandardMaterial, TextureLoader, Texture, DirectionalLight, AmbientLight, Color, Sprite, SpriteMaterial, CameraHelper, OrthographicCamera, Vector3, Scene, WebGLRenderTarget, BoxBufferGeometry, WebGLRenderer, PerspectiveCamera, Material, MeshStandardMaterialParameters } from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter';
import { OBJLoader2 } from 'three/examples/jsm/loaders/OBJLoader2';
import { ThreeViewerItemModel, ThreeViewerItemLight, ThreeViewerItemLightType, ThreeViewerItemPinLayer, ThreeViewerItemPin } from 'src/app/types/three-viewer-item';
import { LocalizedText } from 'src/app/types/item';
import { ErrorEvent } from 'src/app/context.service';
import { moveItemInArray } from '@angular/cdk/drag-drop';

// Utility functions

const computeHash: (data: ArrayBuffer) => Promise<string> = async (data) => {
    return Array.prototype.map.call(
        new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
        (x: number) => x.toString(16).padStart(2, "0")
    ).reduce((prev, curr) => prev + curr, "");
}

export const exportPlyMesh: (meshOrGeometry: Mesh | BufferGeometry) => Promise<ArrayBuffer> = (meshOrGeometry) => {
    let plyExporter = new PLYExporter();

    // This is done because PLYExporter applies the world matrix
    // to the mesh before exporing it, and we don't need that since
    // we store position, rotation and scale in the parent group
    let tempMesh = meshOrGeometry instanceof Mesh ? new Mesh(meshOrGeometry.geometry) : new Mesh(meshOrGeometry);

    return new Promise((resolve, reject) => {
        plyExporter.parse(tempMesh, (result: any) => resolve(result as ArrayBuffer), { binary: true });
    });
};



// Serialization

interface Serializable<T> {
    serialize(binData: BinaryFiles): Promise<T>;
}

export class BinaryFiles {

    files: Map<string, ArrayBuffer> = new Map();

    async store(data: ArrayBuffer, ext: string = "bin"): Promise<string> {

        let name = `./${await computeHash(data)}.${ext}`;

        if (!this.files.has(name)) {
            this.files.set(name, data);
        }

        return name;
    }

}

interface EditorMode {
    setEditorMode(enabled: boolean);
}

interface OnAdd {
    onAdd(scene: Scene): void;
}

interface OnRemove {
    onRemove(scene: Scene): void;
}



export type ThreeViewerResource = Texture | BufferGeometry | MeshStandardMaterial | string;

export class ThreeViewerResources {

    private mappedResources: Map<string, Promise<ThreeViewerResource>> = new Map();
    private resources: ThreeViewerResource[] = [];

    private textureLoader: TextureLoader;
    private plyLoader: PLYLoader;

    constructor() {
        this.textureLoader = new TextureLoader();
        this.plyLoader = new PLYLoader();
    }

    track<T extends ThreeViewerResource>(res: T): T {
        if (!this.resources.includes(res))
            this.resources.push(res);
        return res;
    }




    dispose(): void {
        for (let res of this.resources) {
            if (res instanceof Texture) {
                res.dispose();
            } else if (res instanceof MeshStandardMaterial) {
                res.dispose();
                res.map = null;
                res.normalMap = null;
            } else if (res instanceof BufferGeometry) {
                res.dispose();
                res.setIndex(null);
                for (let attr in res.attributes)
                    res.deleteAttribute(attr);
            } else if (typeof res === "string") {
                URL.revokeObjectURL(res);
            }
        }

        this.mappedResources = new Map();
        this.resources = [];
    }

    createStandardMaterial(params?: MeshStandardMaterialParameters): MeshStandardMaterial {
        return this.track(new MeshStandardMaterial(params));
    }

    async loadArrayBuffer(a: ArrayBuffer): Promise<string> {
        let hash = await computeHash(a);
        if (this.mappedResources.has(hash)) {
            return this.mappedResources.get(hash) as Promise<string>;
        } else {
            let p = Promise.resolve(URL.createObjectURL(new Blob([a])));
            this.mappedResources.set(hash, p);
            return p;
        }
    }

    async loadTexture(url: string): Promise<Texture> {

        if (this.mappedResources.has(url) && this.mappedResources.get(url)) {
            return this.mappedResources.get(url) as Promise<Texture>;
        } else {
            let p = new Promise<Texture>((resolve, reject) => {
                this.textureLoader.load(
                    url,
                    (texture) => resolve(this.track(texture)),
                    null,
                    (error) => reject(<ErrorEvent>{ description: error.message }));
            });

            this.mappedResources.set(url, p);

            return p;
        }
    }

    async loadPlyMesh(url: string): Promise<BufferGeometry> {

        if (this.mappedResources.has(url)) {
            return this.mappedResources.get(url) as Promise<BufferGeometry>;
        } else {
            let p = new Promise<BufferGeometry>((resolve, reject) => {
                this.plyLoader.load(
                    url,
                    (geom) => resolve(this.track(geom)),
                    null,
                    (err) => reject(<ErrorEvent>{ description: JSON.stringify(err) })
                );
            });

            this.mappedResources.set(url, p);

            return p;
        }

    }

    async loadGeometryFromWavefront(wfData: ArrayBuffer): Promise<{ name: string, geometry: BufferGeometry }[]> {
        return new Promise((resolve, reject) => {

            let result: { name: string, geometry: BufferGeometry }[] = [];
            let loader = new OBJLoader2();
            let count = 0;

            loader.setUseOAsMesh(true);

            loader.setCallbackOnAssetAvailable((asset) => {

                if (asset.type === "mesh") {
                    let geometry = new BufferGeometry();

                    if (asset.buffers.vertices)
                        geometry.setAttribute("position", new Float32BufferAttribute(asset.buffers.vertices, 3));

                    if (asset.buffers.normals)
                        geometry.setAttribute("normal", new Float32BufferAttribute(asset.buffers.normals, 3));

                    if (asset.buffers.uvs)
                        geometry.setAttribute("uv", new Float32BufferAttribute(asset.buffers.uvs, 2));

                    let name = asset.params.meshName ? asset.params.meshName : `mesh${count++}`;

                    result.push({ name: name, geometry: this.track(geometry) });

                }

            });

            loader.setCallbackOnError((err) => reject(<ErrorEvent>{ description: JSON.stringify(err) }));

            loader.parse(wfData);

            resolve(result);

        });
    }

}


/**
 * Pin Layer
 */
export class ThreeViewerPinLayer implements Serializable<ThreeViewerItemPinLayer> {
    title: LocalizedText = "";
    description: LocalizedText = "";
    geometry: BufferGeometry = new BoxBufferGeometry(1, 1, 1);
    visible: boolean = true;

    get color(): Color {
        return this._material.color;
    }

    get material(): MeshStandardMaterial {
        return this._material;
    }

    get previewImage(): HTMLImageElement {
        return this._previewImage;
    }

    private _material: MeshStandardMaterial = null;
    private _previewImage: HTMLImageElement = new Image();

    constructor(private resources: ThreeViewerResources) {
        this._material = resources.createStandardMaterial({ color: 0xffffff });
    }

    createPreviewPicture() {
        let renderer = new WebGLRenderer({ alpha: true, antialias: true });
        let scene = new Scene();

        let camera = new PerspectiveCamera(45, 1, 0.1, 10);
        camera.position.set(0, 1.5, -2);
        camera.lookAt(0, 0, 0);

        let canvas = renderer.domElement;
        canvas.width = 128;
        canvas.height = 128;

        let mesh = new Mesh(this.geometry, this._material);
        scene.add(mesh);

        let light = new DirectionalLight(0xffffff);
        light.position.copy(camera.position);
        scene.add(light);

        renderer.setViewport(0, 0, canvas.width, canvas.height);
        renderer.setClearColor(0, 0);
        renderer.clear();
        renderer.render(scene, camera);

        this._previewImage.src = canvas.toDataURL();

        renderer.dispose();


    }

    async serialize(binData: BinaryFiles): Promise<ThreeViewerItemPinLayer> {
        return {
            title: this.title,
            description: this.description,
            color: this.color.getHex(),
            geometry: await binData.store(await exportPlyMesh(this.geometry), "ply")
        }
    }

}

/**
 * Pin
 */

export class ThreeViewerPin extends Mesh implements Serializable<ThreeViewerItemPin>, EditorMode {

    isThreeViewerPin: boolean = true;
    title: LocalizedText = "";
    description: LocalizedText = "";
    href: string = "";
    hrefText: LocalizedText = "";

    set layer(layer: ThreeViewerPinLayer) {
        this.geometry = layer.geometry;
        (this.material as MeshStandardMaterial).color = layer.color;
        this._layer = layer;
    }

    get layer(): ThreeViewerPinLayer {
        return this._layer;
    }

    private _layer: ThreeViewerPinLayer = null;

    constructor(resources: ThreeViewerResources, private _layers: ThreeViewerPinLayer[]) {
        super(new BoxBufferGeometry(1, 1, 1), resources.createStandardMaterial({ color: 0xffffff }));
    }



    setEditorMode(enabled: boolean) { }

    async serialize(binData: BinaryFiles): Promise<ThreeViewerItemPin> {
        let pos = this.position;
        let scl = this.scale;
        let rot = this.rotation;

        return {
            title: this.title,
            description: this.description,
            href: this.href,
            hrefText: this.hrefText,
            position: [pos.x, pos.y, pos.z],
            rotation: [rot.x, rot.y, rot.z],
            scale: [scl.x, scl.y, scl.z],
            layerIndex: this._layers.findIndex(x => x === this._layer)
        }
    }

}


/**
 * Light
 */
export class ThreeViewerLight extends Group implements Serializable<ThreeViewerItemLight>, EditorMode, OnAdd, OnRemove {

    isThreeViewerLight: boolean = true;

    title: LocalizedText = "";
    description: LocalizedText = "";

    lightType: ThreeViewerItemLightType;

    light: DirectionalLight | AmbientLight;

    gizmo: Sprite;
    cameraHelper: CameraHelper;

    _shadowCameraSize: Vector3 = new Vector3();
    _editorMode: boolean = false;

    set shadowMapWidth(v: number) {
        let n: number = typeof v === "string" ? parseFloat(v) || 0 : v;
        this.light.shadow.mapSize.width = Math.max(n, 512);
        this.updateShadowMap();
    }

    set shadowMapHeight(v: number) {
        let n: number = typeof v === "string" ? parseFloat(v) || 0 : v;
        this.light.shadow.mapSize.height = Math.max(n, 512); this.updateShadowMap();
        this.updateShadowMap();
    }

    get shadowMapWidth(): number { return this.light.shadow.mapSize.width; }
    get shadowMapHeight(): number { return this.light.shadow.mapSize.height; }

    get shadowCameraSize(): Vector3 {
        let camera = this.light.shadow.camera as OrthographicCamera;
        return this._shadowCameraSize.set(camera.right - camera.left, camera.top - camera.bottom, camera.far - camera.near);
    }

    set shadowCameraSize(v: Vector3) {
        let camera = this.light.shadow.camera as OrthographicCamera;

        camera.left = -v.x / 2.0; camera.right = v.x / 2.0;
        camera.bottom = -v.y / 2.0; camera.top = v.y / 2.0;
        camera.near = -v.z / 2.0; camera.far = v.z / 2.0;

        this._shadowCameraSize.set(camera.right - camera.left, camera.top - camera.bottom, camera.far - camera.near);

        camera.updateProjectionMatrix();
        this.cameraHelper.update();
    }

    constructor(private resources: ThreeViewerResources, lightType: ThreeViewerItemLightType) {
        super();
        this.lightType = lightType;
        this.initialize();
    }


    onAdd(scene: Scene): void {
        if (this.cameraHelper)
            scene.add(this.cameraHelper);
    }
    onRemove(scene: Scene): void {
        if (this.cameraHelper)
            scene.remove(this.cameraHelper);
    }

    get color(): Color {
        return this.light.color;
    }

    setEditorMode(enabled: boolean) {
        this._editorMode = enabled;
        this.updateEditorMode();
    }

    updateEditorMode(): void {
        if (this.gizmo)
            this.gizmo.visible = this._editorMode;

        if (this.cameraHelper)
            this.cameraHelper.visible = this._editorMode;
    }

    updateMatrixWorld(force?: boolean): void {
        super.updateMatrixWorld(force);
    }


    private updateShadowMap(): void {
        const shadow = this.light.shadow;
        if (shadow.map) {
            (shadow.map as WebGLRenderTarget).setSize(shadow.mapSize.width, shadow.mapSize.height);
        }
    }

    private async createGizmo(): Promise<void> {

        let gizmo = new Sprite(new SpriteMaterial({
            map: await this.resources.loadTexture("core-assets/three-viewer/light-gizmo.png"),
            color: 0xffffff,
            depthTest: false,
            depthWrite: false,
            sizeAttenuation: false
        }));

        gizmo.scale.set(0.1, 0.1, 0.1);
        gizmo.renderOrder = 1;

        this.add(gizmo);

        this.gizmo = gizmo;
    }

    private createCameraHelper(): void {
        this.cameraHelper = new CameraHelper(this.light.shadow.camera);
    }

    private initialize(): void {
        switch (this.lightType) {
            case "ambient":
                this.light = new AmbientLight();
                break;
            case "directional":
                this.light = new DirectionalLight();
                this.light.shadow.mapSize.set(1024, 1024);
                this.createCameraHelper();
                this.createGizmo().then(() => this.updateEditorMode());
                break;
            default:
                throw new Error(`Unknown light type: ${this.lightType}`);
        }


        this.add(this.light);
    }

    async serialize(binData: BinaryFiles): Promise<ThreeViewerItemLight> {
        let pos = this.position;
        let rot = this.rotation;
        let scl = this.scale;


        switch (this.lightType) {
            case "ambient":
                return {
                    title: this.title,
                    description: this.description,
                    position: [pos.x, pos.y, pos.z],
                    rotation: [rot.x, rot.y, rot.z],
                    scale: [scl.x, scl.y, scl.z],
                    type: "ambient",
                    color: this.color.getHex(),
                };
            case "directional":
                return {
                    title: this.title,
                    description: this.description,
                    position: [pos.x, pos.y, pos.z],
                    rotation: [rot.x, rot.y, rot.z],
                    scale: [scl.x, scl.y, scl.z],
                    type: "directional",
                    color: this.color.getHex(),
                    castShadow: this.light.castShadow,
                    shadowMapWidth: this.light.shadow.mapSize.width,
                    shadowMapHeight: this.light.shadow.mapSize.height,
                    shadowCameraSize: [this.shadowCameraSize.x, this.shadowCameraSize.y, this.shadowCameraSize.z]
                };
            default:
                throw new Error(`Unknwon light type: ${this.lightType}`);
        }
    }

}


/**
 * Model
 */
export class ThreeViewerModel extends Group implements Serializable<ThreeViewerItemModel>, EditorMode {

    isThreeViewerModel: boolean = true;

    title: LocalizedText = "";
    description: LocalizedText = "";
    previewImage: string = null;

    private _opacity: number = 1;
    private _currentMaterialIndex: number = null;

    private _materials: ThreeViewerModel.Material[] = [];

    set currentMaterial(index: number) {

        index = parseInt(<any>index);

        let mat = this._materials[index];

        if (mat) {
            this._currentMaterialIndex = index;
            this.meshes.forEach((mesh, index) => mesh.material = mat.meshMaterials[index]);
        }
    }

    get currentMaterial(): number {
        return this._currentMaterialIndex;
    }


    set opacity(value: number) {
        this._opacity = value;
        this._materials
            .reduce((prev, curr) => [...prev, ...curr.meshMaterials], <MeshStandardMaterial[]>[])
            .forEach(mat => mat.opacity = value);
    }

    get opacity(): number {
        return this._opacity;
    }

    get meshes(): Mesh[] {
        return <Mesh[]>this.children.filter(x => x instanceof Mesh);
    }

    get materials(): ThreeViewerModel.Material[] {
        return this._materials.map(x => x);
    }

    constructor(private resources: ThreeViewerResources) {
        super();
    }

    setEditorMode(enabled: boolean) { }

    swapMaterials(previousIdx: number, currentIdx: number): void {
        let current = this._materials[this.currentMaterial];
        moveItemInArray(this._materials, previousIdx, currentIdx);
        this.currentMaterial = this._materials.findIndex(x => x === current);
    }

    removeMaterial(idx: number) {
        if (this._materials.length <= 1)
            return;

        let current = this._materials[this.currentMaterial];

        this._materials.splice(idx, 1);

        if (this.currentMaterial === idx) {
            this.currentMaterial = 0;
        } else {
            this.currentMaterial = this._materials.findIndex(x => x === current);
        }

    }

    addMaterial(meshMaterials?: MeshStandardMaterial[]): ThreeViewerModel.Material {

        if (this.meshes.length === 0) {
            throw new Error("There are no meshes");
        }

        if (!meshMaterials) {
            meshMaterials = this.meshes.map(x => this.resources.createStandardMaterial({
                premultipliedAlpha: false,
                transparent: true,
                color: 0xffffff
            }));
        } 

        if(meshMaterials.length !== this.meshes.length) {
            throw new Error(`Incorrect material count. Expected ${this.meshes.length}, got ${meshMaterials.length}`)
        }

        let newMaterial: ThreeViewerModel.Material = { title: "Material", meshMaterials: meshMaterials }
        this._materials.push(newMaterial);

        if (this._currentMaterialIndex === null)
            this.currentMaterial = 0;

        return newMaterial;

    }

    async serialize(binFiles: BinaryFiles): Promise<ThreeViewerItemModel> {
        let pos = this.position;
        let scl = this.scale;
        let rot = this.rotation;

        let meshes = this.meshes.map(async mesh => {
            let data = await exportPlyMesh(mesh);
            let fileName = await binFiles.store(data, "ply");
            return {
                name: mesh.name,
                file: fileName
            }
        });

        let materials = this._materials.map(async m => {

            let meshMaterials = m.meshMaterials.map(async x => {
                let map = x.map && x.map.image instanceof HTMLImageElement ?
                    await binFiles.store(await (await fetch(x.map.image.src)).arrayBuffer()) :
                    undefined;

                let normalMap = x.normalMap && x.normalMap.image instanceof HTMLImageElement ?
                    await binFiles.store(await (await fetch(x.normalMap.image.src)).arrayBuffer()) :
                    undefined;


                return {
                    color: x.color.getHex(),
                    map: map,
                    normalMap: normalMap
                }
            });

            let previewImage: string = m.previewImage ? await binFiles.store(await (await fetch(m.previewImage)).arrayBuffer()) : undefined;

            return {
                title: m.title,
                description: m.description,
                previewImage: previewImage,
                meshMaterials: await Promise.all(meshMaterials)
            }
        });

        let previewImage: string = this.previewImage ? await binFiles.store(await (await fetch(this.previewImage)).arrayBuffer()) : undefined;

        return {
            title: this.title,
            description: this.description,
            previewImage: previewImage,
            position: [pos.x, pos.y, pos.z],
            rotation: [rot.x, rot.y, rot.z],
            scale: [scl.x, scl.y, scl.z],
            activeMaterial: this.currentMaterial,
            meshes: await Promise.all(meshes),
            materials: await Promise.all(materials)
        }
    }

}

export namespace ThreeViewerModel {
    export type Material = {
        title: LocalizedText;
        description?: LocalizedText;
        previewImage?: string;
        meshMaterials: MeshStandardMaterial[]
    };
}


export type ThreeViewerObject3D = (ThreeViewerModel | ThreeViewerLight | ThreeViewerPin) & EditorMode & Partial<OnAdd> & Partial<OnRemove>;

/**
 * A threejs group with typed children
 */
export class ThreeViewerGroup<T extends ThreeViewerObject3D> extends Group {
    constructor() { super(); }
    children: T[];
    add(...o: T[]): this { 
        super.add(...o); 
        return this; 
    }
    remove(...o: T[]): this { 
        super.remove(...o); 
        return this; 
    }
}