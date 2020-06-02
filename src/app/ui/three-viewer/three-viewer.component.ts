import { Component, OnInit, Input, ViewChild, ElementRef, NgZone, HostListener, OnDestroy, ChangeDetectorRef, OnChanges, DoCheck } from '@angular/core';
import { ThreeViewerItem, ThreeViewerItemLightType } from 'src/app/types/three-viewer-item';
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

import { BinaryFiles, ThreeViewerObject3D, ThreeViewerGroup, ThreeViewerModel, ThreeViewerLight, ThreeViewerPinLayer, ThreeViewerPin, ThreeViewerResources, ThreeViewerResource } from './three-viewer';
import { PinLayerEditorComponent, PinLayerEditorData } from './pin-layer-editor/pin-layer-editor.component';

import { moveItemInArray } from '@angular/cdk/drag-drop'
import { LocationRouterService } from 'src/app/location-router.service';


type EditorTab = "models" | "lights" | "pins";

@Component({
  selector: 'app-three-viewer',
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.scss']
})
export class ThreeViewerComponent implements OnInit, OnDestroy, DoCheck {

  @ViewChild("containerRef", { read: ElementRef, static: true }) containterRef: ElementRef;
  @Input() item: ThreeViewerItem;

  cdkMoveItemInArray = moveItemInArray;

  activeEditorHierarchyGroup: ThreeViewerGroup<any> = null;

  resources: ThreeViewerResources = null;

  lights: ThreeViewerGroup<ThreeViewerLight> = new ThreeViewerGroup();
  models: ThreeViewerGroup<ThreeViewerModel> = new ThreeViewerGroup();
  pins: ThreeViewerGroup<ThreeViewerPin> = new ThreeViewerGroup();

  pinLayers: ThreeViewerPinLayer[] = [];

  clock: Clock = new Clock(true);
  camera: PerspectiveCamera = null;
  scene: Scene = null;
  renderer: WebGLRenderer = null;

  touchControls: TouchControls = null;
  orbitControls: OrbitControls = null;
  transformControls: TransformControls = null;
  gridHelper: GridHelper = null;

  shadowMapSizes: number[] = [512, 1024, 2048, 4096, 8192];

  rayscaster: Raycaster = null;

  width: number = 0;
  height: number = 0;

  allowEditorMode: boolean = false;
  showLoading: boolean = true;
  showLayers: boolean = true;
  selectedPin: ThreeViewerPin = null;
  selectedPinStyle: object = null;


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
      default:
        throw new Error(`Unknown tab: ${tab}`);
    }
  }

  get editorActiveTab(): EditorTab {
    return this._editorActiveTab;
  }


  set editorMode(value: boolean) {
    this._editorMode = value;

    this.touchControls.enabled = !value;
    this.orbitControls.enabled = value;
    this.transformControls.enabled = value;
    this.gridHelper.visible = value;
    this.selectedObject = null;

    this.models.children.forEach(m => m.setEditorMode(value));
    this.lights.children.forEach(l => l.setEditorMode(value));

  }

  get editorMode(): boolean {
    return this._editorMode;
  }

  set selectedObject(obj: any) {
    this._selectedObject = obj;
    obj ? this.transformControls.attach(obj) : this.transformControls.detach();
  }

  get selectedObject(): any {
    return this._selectedObject;
  }

  private _selectedObject: any = null;
  private _editorMode: boolean = false;
  private _editorActiveTab: EditorTab = "models";

  private _disposed: boolean;

  constructor(private zone: NgZone, public context: ContextService, private httpClient: HttpClient, private snackBar: MatSnackBar,
    private router: LocationRouterService, private dialog: MatDialog) {
    this.allowEditorMode = !environment.production;
    this.editorActiveTab = "models";
    this._disposed = false;
  }

  ngDoCheck(): void {
    this.updateSelectedPinStyle();
  }

  async ngOnInit() {

    // Create renderer
    this.renderer = new WebGLRenderer({ premultipliedAlpha: false, alpha: true, antialias: true });

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;

    this.containterRef.nativeElement.appendChild(this.renderer.domElement);

    // Resource manager
    this.resources = new ThreeViewerResources();

    // Raycaster
    this.rayscaster = new Raycaster();

    // Camera
    this.camera = new PerspectiveCamera();
    this.camera.matrixAutoUpdate = true;

    // Scene
    this.scene = new Scene();

    // Grid helper
    this.gridHelper = new GridHelper(20, 20);

    // Transform controls
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.addEventListener('dragging-changed', (evt) => this.orbitControls.enabled = !evt.value);

    // Orbit and touch controls

    this.orbitControls = new OrbitControls(this.camera, this.containterRef.nativeElement);

    this.touchControls = new TouchControls(this.camera, this.containterRef.nativeElement, {
      rotationSpeed: this.item.camera.rotationSpeed,
      zoomStep: this.item.camera.zoomStep,
      zoomDamping: this.item.camera.zoomDamping
    });
    this.touchControls.enabled = false;

    // Add everything to the scene
    this.scene.add(this.transformControls);
    this.scene.add(this.gridHelper);
    this.scene.add(this.models);
    this.scene.add(this.lights);
    this.scene.add(this.pins);

    // Wait for item to load
    let c = new Clock();
    c.start();
    await this.loadItem();
    console.log(c.getDelta());

    // Disable the loading overlay and turn off editor mode by default
    this.showLoading = false;
    this.editorMode = false;

    // Start the render loop (outside angular)
    this.zone.runOutsideAngular(() => {
      this.resize();
      this.render();
    });

  }


  ngOnDestroy(): void {
    this._disposed = true;
  }

  async loadItem(): Promise<void> {

    const resources = this.resources;

    // Setup camera

    this.camera.position.fromArray(this.item.camera.position);
    this.camera.lookAt(this.item.camera.lookAt[0], this.item.camera.lookAt[1], this.item.camera.lookAt[2]);

    // Parallel asset loading. Set up all the promises immediatley without waiting. Might speed up things.
    let resourcePromises: { [name: string]: Promise<ThreeViewerResource> } = {};

    if (this.item.models) {
      for (let modelDef of this.item.models) {

        for (let meshDef of modelDef.meshes)
          resourcePromises[meshDef.file] = resources.loadPlyMesh(this.router.resolve(meshDef.file, this.item));

        for (let materialDef of modelDef.materials) {
          for (let meshMaterialDef of materialDef.meshMaterials) {
            if (meshMaterialDef.map)
              resourcePromises[meshMaterialDef.map] = resources.loadTexture(this.router.resolve(meshMaterialDef.map, this.item));

            if (meshMaterialDef.normalMap)
              resourcePromises[meshMaterialDef.normalMap] = resources.loadTexture(this.router.resolve(meshMaterialDef.normalMap, this.item));
          }
        }

      }
    }

    if (this.item.pinLayers)
      for (let pinLayerDef of this.item.pinLayers)
        resourcePromises[pinLayerDef.geometry] = resources.loadPlyMesh(this.router.resolve(pinLayerDef.geometry, this.item));


    // Load models
    this.models.remove(...this.models.children);


    // I'm not using array functions here (map, forEach, ...) because
    // this is an async function and it would make the code a bit harder
    // to read

    if (this.item.models) {
      for (let modelDef of this.item.models) {
        let model = new ThreeViewerModel(this.resources);
        let pos = modelDef.position;
        let rot = modelDef.rotation;
        let scl = modelDef.scale;

        model.title = modelDef.title;
        model.description = modelDef.description || "";
        model.previewImage = modelDef.previewImage ? this.router.resolve(modelDef.previewImage, this.item) : null;

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
            let mat = resources.createStandardMaterial({ transparent: true, premultipliedAlpha: false, color: meshMaterialDef.color });

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


        // Force rendering to upload data to the GPU
        {
          let tempScene = new Scene();
          tempScene.add(model);
          for (let i = 0; i < model.materials.length; i++) {
            model.currentMaterial = i;
            this.renderer.render(tempScene, this.camera);
          }
        }

        model.currentMaterial = modelDef.activeMaterial || 0;


        this.models.add(model);
        this.onObjectAdded(model);

      }
    }

    // Load lights

    this.lights.remove(...this.lights.children);

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
    this.pinLayers = [];
    this.pins.remove(...this.pins.children);

    if (this.item.pinLayers) {
      for (let pinLayerDef of this.item.pinLayers) {
        let layer = new ThreeViewerPinLayer(resources);

        layer.title = pinLayerDef.title;
        layer.description = pinLayerDef.description || "";
        layer.color.setHex(pinLayerDef.color);

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


    // Load other stuff

  }

  async uploadModelPreviewImage(model: ThreeViewerModel) {
    let file = await this.context.fileChooser({ type: "arraybuffer", accept: ".png,.jpg,.jpeg" });
    model.previewImage = await this.resources.loadArrayBuffer(file.data as ArrayBuffer);
  }

  async loadModelFromWaveFront() {

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
    if (obj.onAdd) {
      obj.onAdd(this.scene);
      obj.setEditorMode(this.editorMode);
    }
  }

  onObjectRemoved(obj: ThreeViewerObject3D) {
    if (obj.onRemove)
      obj.onRemove(this.scene);

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

  dispose(): void {

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

    if (this.touchControls)
      this.touchControls.dispose();

    if (this.transformControls)
      this.transformControls.dispose();

    this.resources.dispose();

    // The objects disposal should have been handled by the resource tracking system
    // so no need to traverse the scene for them
    this.models.remove(...this.models.children);
    this.pins.remove(...this.pins.children);
    this.lights.remove(...this.lights.children);
    this.scene.remove(...this.scene.children);

    // Traverse the scene for all the remaining objects, moslty should be helper controls and
    // dispose their meshes. Don't look for textures, there shouldn't be any
    this.scene.traverse(disposeObject3D);

    this.scene.dispose();
    this.renderer.dispose();

    this.models = null;
    this.lights = null;
    this.pinLayers = null;
    this.pins = null;

    this.scene = null;
    this.camera = null;
    this.renderer = null;

  }

  render() {

    if (this._disposed) {
      this.dispose();
      return;
    }


    requestAnimationFrame(this.render.bind(this));

    // This has to run outside angualar zone for performance
    NgZone.assertNotInAngularZone();

    let dt: number = this.clock.getDelta();
    let renderer = this.renderer;
    let w = this.width, h = this.height;

    this.renderer.setViewport(0, 0, w, h);

    this.updateCamera(dt);

    this.pins.children.forEach(pin => pin.visible = pin.layer.visible);

    renderer.setClearColor(0, 0);
    renderer.clear(true, true);

    renderer.render(this.scene, this.camera);
  }

  async export(): Promise<void> {

    let lookAt = new Vector3();
    let binFiles = new BinaryFiles();


    this.showLoading = true;

    this.camera.getWorldDirection(lookAt);
    lookAt.add(this.camera.position);


    let exportItem: ThreeViewerItem = {
      type: "3d",
      camera: {
        position: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
        lookAt: [lookAt.x, lookAt.y, lookAt.z],
        rotationSpeed: this.item.camera.rotationSpeed,
        zoomStep: this.item.camera.zoomStep,
        zoomDamping: this.item.camera.zoomDamping
      },
      models: await Promise.all(this.models.children.map(model => model.serialize(binFiles))),
      lights: await Promise.all(this.lights.children.map(light => light.serialize(binFiles))),
      pinLayers: await Promise.all(this.pinLayers.map(pinLayer => pinLayer.serialize(binFiles))),
      pins: await Promise.all(this.pins.children.map(pin => pin.serialize(binFiles)))
    };

    await this.httpClient.delete(this.router.resolve("./", this.item), { responseType: "text" }).toPromise();

    await this.httpClient.post(this.router.resolve("./item.json", this.item),
      new Blob([JSON.stringify(exportItem)], { type: "text/html" }),
      { responseType: "text" }).toPromise();

    for (let [name, data] of binFiles.files) {
      await this.httpClient.post(this.router.resolve(name, this.item),
        new Blob([data], { type: "application/octet-stream" }),
        { responseType: "text" }).toPromise()
    }

    this.showLoading = false;

    this.snackBar.open("Scene saved!");

  }

  onCanvasClick(evt: PointerEvent): void {

    if (this.editorMode) {
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

  @HostListener("window:resize")
  resize() {
    this.width = this.renderer.domElement.width = this.containterRef.nativeElement.clientWidth;
    this.height = this.renderer.domElement.height = this.containterRef.nativeElement.clientHeight;
  }

  @HostListener("keydown", ["$event"])
  onKeyDown(evt: KeyboardEvent) {

    if (evt.code === "KeyQ") {
      console.log(this.renderer.info);
    }

    if (this.editorMode) {
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

}
