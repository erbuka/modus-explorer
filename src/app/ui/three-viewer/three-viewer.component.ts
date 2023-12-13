import { Component, OnInit, Input, ViewChild, ElementRef, NgZone, HostListener, OnDestroy, DoCheck } from '@angular/core';
import { ThreeViewerItem, ThreeViewerItemLightType, ThreeViewerItemCameraControls } from 'src/app/types/three-viewer-item';
import { Scene, WebGLRenderer, PerspectiveCamera, Clock, Raycaster, Mesh, MeshStandardMaterial, GridHelper, Vector3, DirectionalLight, PCFShadowMap, Vector2, Object3D, CameraHelper, BufferGeometry, Texture } from 'three';
import { environment } from 'src/environments/environment';
import { ContextService, FileChooserResult } from 'src/app/context.service';

import { TouchControls } from './touch-controls';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MaterialEditorComponent } from './material-editor/material-editor.component';

import { BinaryFiles, ThreeViewerObject3D, ThreeViewerGroup, ThreeViewerModel, ThreeViewerLight, ThreeViewerPinLayer, ThreeViewerPin, ThreeViewerResources, ThreeViewerResource, ThreeViewerCollider } from './three-viewer';
import { PinLayerEditorComponent, PinLayerEditorData } from './pin-layer-editor/pin-layer-editor.component';

import { moveItemInArray } from '@angular/cdk/drag-drop'
import { LocationRouterService } from 'src/app/location-router.service';
import { State } from 'src/app/classes/state';
import { PageItem } from 'src/app/types/page-item';
import { Item } from 'src/app/types/item';
import { ContentProviderService } from 'src/app/content-provider.service';
import { Subscription } from 'rxjs';
import { ItemSave } from '../item/item.component';


type EditorTab = "models" | "lights" | "pins" | "colliders";

type LoadingScreenData = {
	mode: "determinate" | "indeterminate";
	show: boolean;
	text: string;
	current: number;
	total: number;
}

type UserPopup = {
	itemUri: string;
	item: PageItem;
	open: boolean;
}

class AnimationFrameHandler {
	private _function: () => void = null;
	private _canceled: boolean = false;
	private _started: boolean = false;
	private _id: number = 0;
	constructor(fn: () => void) {
		this._function = fn;
	}

	start(): void {
		if (!this._started) {
			this._started = true;
			this.loop();
		}
	}

	cancel(): void {
		if (this._started) {
			this._canceled = true;
			cancelAnimationFrame(this._id);
		}
	}

	private loop(): void {
		if (this._canceled)
			return;
		this._id = requestAnimationFrame(this.loop.bind(this));
		this._function();
	}

}


@Component({
	selector: 'app-three-viewer',
	templateUrl: './three-viewer.component.html',
	styleUrls: ['./three-viewer.component.scss'],
})
export class ThreeViewerComponent implements OnInit, OnDestroy, DoCheck, ItemSave {

	@ViewChild("containerRef", { read: ElementRef, static: true }) containterRef: ElementRef;
	@Input() item: ThreeViewerItem;

	cdkMoveItemInArray = moveItemInArray;

	userPopup: UserPopup;

	activeEditorHierarchyGroup: ThreeViewerGroup<any> = null;

	resources: ThreeViewerResources = null;

	lights: ThreeViewerGroup<ThreeViewerLight> = new ThreeViewerGroup();
	models: ThreeViewerGroup<ThreeViewerModel> = new ThreeViewerGroup();
	pins: ThreeViewerGroup<ThreeViewerPin> = new ThreeViewerGroup();
	colliders: ThreeViewerGroup<ThreeViewerCollider> = new ThreeViewerGroup();

	pinLayers: ThreeViewerPinLayer[] = [];

	clock: Clock = new Clock(true);
	camera: PerspectiveCamera = null;
	scene: Scene = null;
	renderer: WebGLRenderer = null;

	controls: TouchControls | OrbitControls = null;
	editorControls: OrbitControls = null;
	transformControls: TransformControls = null;
	gridHelper: GridHelper = null;

	shadowMapSizes: number[] = [512, 1024, 2048, 4096, 8192];

	rayscaster: Raycaster = null;

	width: number = 0;
	height: number = 0;

	layerControls: boolean = true;
	allowEditorMode: boolean = false;
	showLayers: boolean = true;
	selectedPin: ThreeViewerPin = null;
	selectedPinStyle: object = null;

	loadingScreen: LoadingScreenData = {
		mode: "indeterminate",
		show: true,
		text: "Loading",
		current: 0,
		total: 1
	};


	set editorActiveTab(tab: EditorTab) {
		this._editorActiveTab = tab;
		switch (tab) {
			case "models":
				this.activeEditorHierarchyGroup = this.models;
				break;
			case "lights":
				this.activeEditorHierarchyGroup = this.lights;
				break;
			case "pins":
				this.activeEditorHierarchyGroup = this.pins;
				break;
			case "colliders":
				this.activeEditorHierarchyGroup = this.colliders;
				break;
			default:
				throw new Error(`Unknown tab: ${tab}`);
		}
	}

	get editorActiveTab(): EditorTab {
		return this._editorActiveTab;
	}

	set selectedObject(obj: any) {

		if (obj === this._selectedObject)
			return;

		if (this._selectedObject)
			this._selectedObject.setSelected(false);


		this._selectedObject = obj;

		if (obj) {
			obj.setSelected(true);
			this.transformControls.attach(obj);
		} else {
			this.transformControls.detach();
		}
	}

	get selectedObject(): any {
		return this._selectedObject;
	}

	private _selectedObject: any = null;
	private _editorActiveTab: EditorTab = "models";
	private _animFrameHandler: AnimationFrameHandler = null;
	private _loadedItem: ThreeViewerItem = null;
	private _subscription: Subscription = new Subscription();

	constructor(private contentProvider: ContentProviderService, private zone: NgZone, public context: ContextService, private httpClient: HttpClient, private snackBar: MatSnackBar,
		public router: LocationRouterService, private dialog: MatDialog, private state: State, private locationRouter: LocationRouterService) {

		// Create renderer
		this.renderer = new WebGLRenderer({ premultipliedAlpha: false, alpha: true, antialias: true });
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = PCFShadowMap;

		// Resource manager
		this.resources = new ThreeViewerResources(this.renderer);

		// Raycaster
		this.rayscaster = new Raycaster();

		// Camera
		this.camera = new PerspectiveCamera(50, 1, 0.1, 2000.0);
		this.camera.matrixAutoUpdate = true;

	}

	ngDoCheck(): void {
		if (this._loadedItem != this.item && this.item != null)
			this.loadItem();

		this.updateSelectedPinStyle();
	}

	ngOnInit() {
		this.containterRef.nativeElement.appendChild(this.renderer.domElement);
	}


	ngOnDestroy(): void {
		this.dispose();
	}

	async loadItem(): Promise<void> {

		const resources = this.resources;

		// Lock router navigation
		this.router.locked = true;

		this.unloadItem();
		this._loadedItem = this.item;

		// Layer controls
		this.layerControls = this.item.layerControls !== undefined ? this.item.layerControls : true;

		// Transform controls
		this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
		this.transformControls.addEventListener('dragging-changed', (evt) => this.editorControls.enabled = !evt.value);

		// Orbit and touch controls
		this.editorControls = new OrbitControls(this.camera, this.renderer.domElement);
		this.editorControls.enabled = false;



		// Grid helper
		this.gridHelper = new GridHelper(20, 20);
		this.gridHelper.visible = false;

		// Scene
		this.scene = new Scene();

		// Add everything to the scene
		this.scene.add(this.transformControls);
		this.scene.add(this.gridHelper);
		this.scene.add(this.models);
		this.scene.add(this.lights);
		this.scene.add(this.pins);
		this.scene.add(this.colliders);

		this.editorActiveTab = "models";

		// Load saved state
		let state = this.state.getState();

		let cameraPosition = this.item.camera.position;
		let cameraLookAt = this.item.camera.lookAt;

		if (state) {
			cameraPosition = state.cameraPosition;
			cameraLookAt = state.cameraLookAt;
		}

		// Setup camera
		this.camera.position.fromArray(cameraPosition);
		this.camera.lookAt(cameraLookAt[0], cameraLookAt[1], cameraLookAt[2]);



		// Controls
		this.loadControls();

		// Start with the controls disabled so that the user can't move while loading
		this.controls.enabled = false;

		// Parallel asset loading. Set up all the promises immediatley without waiting. Might speed up things.
		let resourcePromises: { [name: string]: Promise<ThreeViewerResource> } = {};

		if (this.item.models) {
			for (let modelDef of this.item.models) {

				for (let meshDef of modelDef.meshes)
					resourcePromises[meshDef.file] = resources.loadPlyMesh(meshDef.file);

				for (let materialDef of modelDef.materials) {
					for (let meshMaterialDef of materialDef.meshMaterials) {
						if (meshMaterialDef.map)
							resourcePromises[meshMaterialDef.map] = resources.loadTexture(meshMaterialDef.map);

						if (meshMaterialDef.normalMap)
							resourcePromises[meshMaterialDef.normalMap] = resources.loadTexture(meshMaterialDef.normalMap);
					}
				}

			}
		}

		if (this.item.pinLayers)
			for (let pinLayerDef of this.item.pinLayers)
				resourcePromises[pinLayerDef.geometry] = resources.loadPlyMesh(pinLayerDef.geometry);


		if (this.item.colliders)
			for (let colliderDef of this.item.colliders)
				resourcePromises[colliderDef.geometry] = resources.loadPlyMesh(colliderDef.geometry);

		// Setup loading screen
		this.loadingScreen.mode = "determinate";
		this.loadingScreen.text = "Loading assets";
		this.loadingScreen.show = true;
		this.loadingScreen.current = 0;
		this.loadingScreen.total = Object.entries(resourcePromises).length;
		Object.values(resourcePromises).forEach(p => p.then(() => this.loadingScreen.current++));


		// Load models
		if (this.item.models) {
			for (let modelDef of this.item.models) {
				let model = new ThreeViewerModel(this.resources);
				let pos = modelDef.position;
				let rot = modelDef.rotation;
				let scl = modelDef.scale;

				model.title = modelDef.title;
				model.visible = typeof modelDef.visible === "boolean" ? modelDef.visible : true;
				model.description = modelDef.description || "";
				model.previewImage = modelDef.previewImage ?? modelDef.previewImage;

				if (pos)
					model.position.fromArray(pos);

				if (rot)
					model.rotation.fromArray(rot);

				if (scl)
					model.scale.fromArray(scl);

				for (let meshDef of modelDef.meshes) {
					let geometry = (await resourcePromises[meshDef.file]) as BufferGeometry;
					let mesh = new Mesh(geometry, resources.createStandardMaterial());

					mesh.castShadow = true;
					mesh.receiveShadow = true;

					mesh.name = meshDef.name;
					model.add(mesh);
				}

				for (let materialDef of modelDef.materials) {

					let materials: MeshStandardMaterial[] = [];

					for (let meshMaterialDef of materialDef.meshMaterials) {
						let mat = resources.createStandardMaterial({ premultipliedAlpha: false, color: meshMaterialDef.color });

						if (meshMaterialDef.map)
							mat.map = (await resourcePromises[meshMaterialDef.map]) as Texture;

						if (meshMaterialDef.normalMap)
							mat.normalMap = (await resourcePromises[meshMaterialDef.normalMap]) as Texture;

						materials.push(mat);
					}

					let material = model.addMaterial(materials);
					material.title = materialDef.title;
					material.description = materialDef.description;
					material.previewImage = materialDef.previewImage;
				}

				model.currentMaterial = modelDef.activeMaterial || 0;
				model.opacity = typeof modelDef.opacity === "number" ? modelDef.opacity : 1.0;
				model.transparent = !!modelDef.transparent;

				this.models.add(model);
				this.onObjectAdded(model);

			}
		}

		// Load lights
		if (this.item.lights) {

			for (let lightDef of this.item.lights) {

				let [pos, rot, scl] = [lightDef.position, lightDef.rotation, lightDef.scale];
				let light = new ThreeViewerLight(resources, lightDef.type);

				light.title = lightDef.title;
				light.description = lightDef.description || "";

				light.color.setHex(lightDef.color);

				if (lightDef.type === "directional") {
					(light.light as DirectionalLight).castShadow = lightDef.castShadow;
					light.shadowCameraSize = new Vector3().fromArray(lightDef.shadowCameraSize);
					light.shadowMapWidth = lightDef.shadowMapWidth;
					light.shadowMapHeight = lightDef.shadowMapHeight;
				}

				if (pos)
					light.position.fromArray(pos);

				if (rot)
					light.rotation.fromArray(rot);

				if (scl)
					light.scale.fromArray(scl);

				this.lights.add(light);
				this.onObjectAdded(light);

			}
		}

		// Load pin layers
		if (this.item.pinLayers) {
			for (let pinLayerDef of this.item.pinLayers) {
				let layer = new ThreeViewerPinLayer(resources);

				layer.title = pinLayerDef.title;
				layer.description = pinLayerDef.description || "";
				layer.color.setHex(pinLayerDef.color);
				layer.transparent = pinLayerDef.transparent;

				// So here we're copying the pin geometry, since multiple pin layers might share the same mesh.
				// Instead, since all the pins share of a layer share the same geometry, we need each layer to have
				// a unique geometry
				// We have also to track the new geometry as well
				let geom = (await resourcePromises[pinLayerDef.geometry]) as BufferGeometry;
				layer.geometry = this.resources.track(new BufferGeometry()).copy(geom);

				layer.createPreviewPicture();

				this.pinLayers.push(layer);

			}
		}

		// Load pins
		if (this.item.pins) {
			for (let pinDef of this.item.pins) {
				let pin = new ThreeViewerPin(resources, this.pinLayers);
				let [pos, rot, scl] = [pinDef.position, pinDef.rotation, pinDef.scale];

				pin.title = pinDef.title;
				pin.description = pinDef.description || "";
				pin.href = pinDef.href || "";
				pin.hrefText = pinDef.hrefText || "";

				if (pos)
					pin.position.fromArray(pos);

				if (rot)
					pin.rotation.fromArray(rot);

				if (scl)
					pin.scale.fromArray(scl);

				pin.layer = this.pinLayers[pinDef.layerIndex];

				this.pins.add(pin);
				this.onObjectAdded(pin);

			}
		}

		// Load colliders 
		if (this.item.colliders) {
			for (let colliderDef of this.item.colliders) {
				let collider = new ThreeViewerCollider(this.resources, (await resourcePromises[colliderDef.geometry]) as BufferGeometry);

				let pos = colliderDef.position;
				let rot = colliderDef.rotation;
				let scl = colliderDef.scale;

				collider.title = colliderDef.title;
				colliderDef.description = colliderDef.description || "";

				if (pos)
					collider.position.fromArray(pos);

				if (rot)
					collider.rotation.fromArray(rot);

				if (scl)
					collider.scale.fromArray(scl);

				this.colliders.add(collider);
				this.onObjectAdded(collider);

			}
		}

		// User popup 
		// TODO: temp
		if (this.item.userPopup) {


			try {
				const itemUri = this.locationRouter.resolve(this.item.userPopup.pageItemUri, this.item);
				const item: Item = await this.contentProvider.getItem(itemUri);
				if (item.type === "page") {
					this.userPopup = {
						itemUri: this.item.userPopup.pageItemUri,
						item: item,
						open: true
					}
				} else {
					throw new Error(`Invalid item type: ${item.type}`);
				}
			}
			catch (e) {
				console.error(e)
			}
		}

		// Close loading screen
		this.loadingScreen.show = false;

		// Save the state again
		this.saveState();

		// Editor mode. This must be done here after the scene has been created
		const sub = this.context.editorMode.subscribe({
			next: value => {

				this.controls.enabled = !value;
				this.editorControls.enabled = value;
				this.transformControls.enabled = value;
				this.gridHelper.visible = value;
				this.selectedObject = null;
				this.selectedPin = null;

				this.models.children.forEach(m => m.setEditorMode(value));
				this.lights.children.forEach(l => l.setEditorMode(value));
				this.colliders.children.forEach(c => c.setEditorMode(value));

				if (value) {
					this.editorControls.update();
				} else {
					this.controls.update();
				}

			}
		});

		this._subscription.add(sub);


		// Run the animation loop
		this.zone.runOutsideAngular(() => {

			// Setup animation frame
			this._animFrameHandler = new AnimationFrameHandler(this.render.bind(this));
			this._animFrameHandler.start();

			// Unlock router
			this.router.locked = false;

			// Switch editor mode off
			// this.context.editorMode.next(false)
			// setTimeout(() =>  = false, 0);
		});

	}

	toggleUserPopup(open: boolean): void {
		this.userPopup.open = open;
		if (open) {
			// TODO: timer
		}
	}

	loadControls(): void {
		const controlsType: ThreeViewerItemCameraControls = this.item.camera.controls || "fly";

		if (controlsType === "fly") {
			this.controls = new TouchControls(this.camera, this.renderer.domElement, {
				rotationSpeed: this.item.camera.rotationSpeed || 1.0,
				zoomStep: this.item.camera.zoomStep || 1.0,
				zoomDamping: this.item.camera.zoomDamping || Number.POSITIVE_INFINITY
			});

			this.controls.addEventListener("change", (evt) => this.saveState());

		} else { // orbit
			this.controls = new OrbitControls(this.camera, this.renderer.domElement);
			this.controls.rotateSpeed = this.item.camera.rotationSpeed || 1.0;
			this.controls.zoomSpeed = this.item.camera.zoomStep || 1.0;
			this.controls.minDistance = this.item.camera.orbitMinDistance || 0;
			this.controls.maxDistance = this.item.camera.orbitMaxDistance || Number.POSITIVE_INFINITY;
			this.controls.enablePan = true;

			this.controls.addEventListener("change", (evt) => this.saveState());

		}
	}

	async uploadModelPreviewImage(model: ThreeViewerModel) {
		let file = await this.context.fileChooser({ type: "arraybuffer", accept: ".png,.jpg,.jpeg" });
		model.previewImage = await this.resources.loadArrayBuffer(file.data as ArrayBuffer);
	}

	async addCollider() {

		let fileChooserResult: FileChooserResult = await this.context.fileChooser({ type: "arraybuffer", accept: ".obj" });
		let geometries = await this.resources.loadGeometryFromWavefront(fileChooserResult.data as ArrayBuffer);

		for (let geom of geometries) {
			let collider = new ThreeViewerCollider(this.resources, geom.geometry);
			collider.title = geom.name;

			this.colliders.add(collider);
			this.onObjectAdded(collider);
		}

		this.updateCollisionBounds();
	}

	async addModel() {

		let fileChooserResult: FileChooserResult = await this.context.fileChooser({ type: "arraybuffer", accept: ".obj" });
		let geometries = await this.resources.loadGeometryFromWavefront(fileChooserResult.data as ArrayBuffer);
		let result = new ThreeViewerModel(this.resources);

		result.title = fileChooserResult.file.name;

		geometries.forEach(g => {
			let mesh = new Mesh(g.geometry);
			mesh.name = g.name;
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			result.add(mesh);
		});

		let material = result.addMaterial();
		material.title = "Default";

		this.models.add(result);
		this.onObjectAdded(result);

	}


	addPin(layer: ThreeViewerPinLayer): void {
		let pin = new ThreeViewerPin(this.resources, this.pinLayers);

		pin.title = "Pin";

		pin.layer = layer;
		this.pins.add(pin);
		this.onObjectAdded(pin);
	}

	addLight(type: ThreeViewerItemLightType): void {
		let light = new ThreeViewerLight(this.resources, type);
		light.title = "Light";
		this.lights.add(light);
		this.onObjectAdded(light);
	}


	onObjectAdded(obj: ThreeViewerObject3D) {
		if (obj.onAdd)
			obj.onAdd(this.scene);

		obj.setEditorMode(this.context.editorMode.value);

		if (obj instanceof ThreeViewerCollider)
			this.updateCollisionBounds();

	}

	onObjectRemoved(obj: ThreeViewerObject3D) {
		if (obj.onRemove)
			obj.onRemove(this.scene);

		if (obj instanceof ThreeViewerCollider)
			this.updateCollisionBounds();

		if (obj === this.selectedObject) {
			this.selectedObject = null;
		}
	}

	editPinLayers(): void {
		let dialogRef = this.dialog.open(PinLayerEditorComponent, {
			minWidth: "1024px",
			width: "1024px",
			position: {
				top: "100px"
			},
			data: <PinLayerEditorData>{
				pinLayers: this.pinLayers,
				resources: this.resources
			}
		});

		let sub = dialogRef.componentInstance.pinLayerDeleted.subscribe({
			next: (layer: ThreeViewerPinLayer) => {
				let toRemove = this.pins.children.filter(x => x.layer === layer);
				this.pins.remove(...toRemove);
				toRemove.forEach(x => this.onObjectRemoved(x));
			}
		});

		dialogRef.afterClosed().subscribe({
			next: () => sub.unsubscribe()
		});

	}

	editMaterials(model: ThreeViewerModel): void {
		this.dialog.open(MaterialEditorComponent, {
			minWidth: "1024px",
			width: "1024px",
			position: {
				top: "100px"
			},
			data: {
				model: model,
				resources: this.resources
			}
		})
	}

	unloadItem(): void {
		if (this._loadedItem == null)
			return;

		const disposeObject3D = (obj: any) => {

			// Dispose the geometry
			if (obj.geometry) {

				obj.geometry.setIndex(null);

				for (let attr in obj.geometry.attributes)
					obj.geometry.deleteAttribute(attr);

			}

			// Dispose the materials
			if (obj.material)
				obj.material.dispose();

			// If the object has a dispose method, just call it
			if (obj.dispose && typeof obj.dispose === "function")
				obj.dispose();

		};

		this._subscription.unsubscribe();

		this.resources.dispose();

		this._animFrameHandler.cancel();

		this.controls.dispose();
		this.transformControls.dispose();

		// Traverse the scene for all the remaining objects, moslty should be helper controls and
		// dispose their meshes. Don't look for textures, there shouldn't be any
		this.scene.traverse(disposeObject3D);
		//this.scene.dispose();

		this.models.remove(...this.models.children);
		this.pins.remove(...this.pins.children);
		this.lights.remove(...this.lights.children);
		this.colliders.remove(...this.colliders.children);
		this.pinLayers = [];

		this.renderer.renderLists.dispose();

		this.userPopup = null;

		this._loadedItem = null;
	}

	dispose(): void {
		this.unloadItem();

		this.renderer.domElement.remove();
		this.renderer.dispose();

		this._animFrameHandler.cancel();

		this.models = null;
		this.lights = null;
		this.colliders = null;
		this.pinLayers = null;
		this.pins = null;

		this.scene = null;
		this.camera = null;
		this.renderer = null;

	}

	render() {

		// This has to run outside angualar zone for performance
		NgZone.assertNotInAngularZone();

		this.resize();

		let dt: number = this.clock.getDelta();
		let renderer = this.renderer;
		let w = this.width, h = this.height;

		this.renderer.setViewport(0, 0, w, h);

		this.updateCamera(dt);

		this.pins.children.forEach(pin => pin.visible = (pin.layer.visible && !pin.layer.transparent));

		renderer.setClearColor(0, 0);
		renderer.clear(true, true);

		renderer.render(this.scene, this.camera);

	}

	async save() {

		const itemId = this.item.id;

		let lookAt = new Vector3();
		let binFiles = new BinaryFiles(this.contentProvider, this.item);

		this.loadingScreen.text = "Saving...";
		this.loadingScreen.mode = "indeterminate";
		this.loadingScreen.show = true;

		this.camera.getWorldDirection(lookAt);
		lookAt.add(this.camera.position);

		let exportItem: ThreeViewerItem = {
			id: itemId,
			type: "3d",
			camera: {
				position: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
				lookAt: [lookAt.x, lookAt.y, lookAt.z],
				rotationSpeed: this.item.camera.rotationSpeed,
				zoomStep: this.item.camera.zoomStep,
				zoomDamping: this.item.camera.zoomDamping,
				controls: this.item.camera.controls,
				orbitMinDistance: this.item.camera.orbitMinDistance,
				orbitMaxDistance: this.item.camera.orbitMaxDistance
			},
			userPopup: this.userPopup ? {
				pageItemUri: this.userPopup.itemUri
			} : undefined,
			models: await Promise.all(this.models.children.map(model => model.serialize(binFiles))),
			lights: await Promise.all(this.lights.children.map(light => light.serialize(binFiles))),
			pinLayers: await Promise.all(this.pinLayers.map(pinLayer => pinLayer.serialize(binFiles))),
			pins: await Promise.all(this.pins.children.map(pin => pin.serialize(binFiles))),
			colliders: await Promise.all(this.colliders.children.map(collider => collider.serialize(binFiles)))
		};

		await this.contentProvider.storeItem(exportItem);

		/*
				await this.httpClient.delete(this.router.resolve("./", this.item), { responseType: "text" }).toPromise();
		
				await this.httpClient.post(this.router.resolve("./item.json", this.item),
					new Blob([JSON.stringify(exportItem)], { type: "text/html" }),
					{ responseType: "text" }).toPromise();
		
				for (let [name, data] of binFiles.files) {
					await this.httpClient.post(this.router.resolve(name, this.item),
						new Blob([data], { type: "application/octet-stream" }),
						{ responseType: "text" }).toPromise()
				}
		*/
		this.loadingScreen.show = false;

		this.snackBar.open("Scene saved!");

	}

	onCanvasClick(evt: PointerEvent): void {

		if (this.context.editorMode.value) {
			// In editor mode, we just want to select objects that are clicked
			// So we use raycast on every object of the scene to check if one is clicked

			let rect = this.renderer.domElement.getBoundingClientRect();
			let mouse = {
				x: (evt.clientX - rect.left) / rect.width * 2.0 - 1.0,
				y: (evt.clientY - rect.top) / rect.height * -2.0 + 1.0,
			};

			// Objects that can be selected are models, lights and pins
			let allObjects: Object3D[] = [...this.models.children, ...this.lights.children, ...this.pins.children];

			this.rayscaster.setFromCamera(mouse, this.camera);
			let intersections = this.rayscaster.intersectObjects(allObjects, true);

			// We need to sort intersections first by render order because gizmos (like the lights)
			// are drawn on top of everything and so they should be prioritezed
			intersections.sort((a, b) => {
				return a.object.renderOrder == b.object.renderOrder ?
					a.distance - b.distance : b.object.renderOrder - a.object.renderOrder
			});

			for (let intersection of intersections) {

				// This is temporary for now, but basically we want to ignore the camera helper
				if (intersection.object instanceof CameraHelper)
					continue;

				let first = intersection.object;

				while (first != null && !allObjects.includes(first))
					first = first.parent;

				if (first != null) {
					this.selectedObject = first;
					break
				}
			}


		} else {
			// In normal mode, we want to check if a pin is clicked, and if it, display its popup

			// Traverse the object tree up to see if it's a pin. If it is, return that object, otherwise return null
			const getPin = (obj: any) => {
				if (obj.isThreeViewerPin) {
					return obj;
				} else {
					return obj.parent ? getPin(obj.parent) : null;
				}
			};

			let rect = this.renderer.domElement.getBoundingClientRect();
			let mouse = {
				x: (evt.clientX - rect.left) / rect.width * 2.0 - 1.0,
				y: (evt.clientY - rect.top) / rect.height * -2.0 + 1.0,
			};

			// Techinally we should test intersections only with the pins, but some other
			// object could be closer, and so we need to consider models too
			let objects: Object3D[] = [...this.models.children, ...this.pins.children];

			this.rayscaster.setFromCamera(mouse, this.camera);

			let intersections = this.rayscaster.intersectObjects(objects, true);

			// Here we consider only the first intersection
			if (intersections.length > 0) {
				let pin = getPin(intersections[0].object);

				if (pin) {
					this.selectedPin = pin;
				}

			}

		}
	}

	resetCamera(): void {
		// Dipose the current controls (removing event listeners)
		this.controls.dispose();

		// Reset camera to initial state
		this.camera.position.fromArray(this.item.camera.position);
		this.camera.lookAt(this.item.camera.lookAt[0], this.item.camera.lookAt[1], this.item.camera.lookAt[2]);

		// Create new controls
		this.loadControls();
	}

	@HostListener("window:resize")
	resize() {
		this.width = this.renderer.domElement.width = this.containterRef.nativeElement.clientWidth || window.innerWidth;
		this.height = this.renderer.domElement.height = this.containterRef.nativeElement.clientHeight || window.innerHeight;
	}

	@HostListener("window:keydown", ["$event"])
	onKeyDown(evt: KeyboardEvent) {
		if (this.context.editorMode.value) {
			switch (evt.code) {
				case "KeyR": this.transformControls.mode = "rotate"; break;
				case "KeyT": this.transformControls.mode = "translate"; break;
				case "KeyS": this.transformControls.mode = "scale"; break;
			}
		}
	}

	private updateSelectedPinStyle(): void {
		if (this.selectedPin) {
			let pos = this.selectedPin.position.clone()
				.project(this.camera);

			if (pos.x < -1 || pos.x > 1 || pos.y < -1 || pos.y > 1) {
				this.selectedPin = null;
				this.selectedPinStyle = null;
			} else {

				pos.addScalar(1).divideScalar(2).multiply(new Vector3(this.width, this.height, 1.0));

				this.selectedPinStyle = {
					left: pos.x + "px",
					top: (this.height - pos.y) + "px"
				};
			}
		} else {
			this.selectedPinStyle = null;
		}
	}

	private updateCamera(dt: number): void {
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	private saveState(): void {
		//console.log("ThreeViewerComponent.saveState()");

		let lookDir = this.camera.getWorldDirection(new Vector3());
		let lookAt = new Vector3().copy(this.camera.position).add(lookDir);

		this.state.saveState({
			cameraPosition: this.camera.position.toArray(),
			cameraLookAt: lookAt.toArray()
		});
	}

	private updateCollisionBounds(): void {
		if (this.controls instanceof TouchControls) {
			this.controls.bounds.set(...this.colliders.children);
		}
	}

}
