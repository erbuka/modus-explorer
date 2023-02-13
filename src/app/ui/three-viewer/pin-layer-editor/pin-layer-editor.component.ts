import { Component, OnInit, Inject, ViewChild, ElementRef, NgZone, OnDestroy, Output, EventEmitter } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ThreeViewerPinLayer, ThreeViewerResources } from '../three-viewer';
import { WebGLRenderer, Scene, Mesh, BoxGeometry, PerspectiveCamera, DirectionalLight } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { ContextService } from 'src/app/context.service';


export type PinLayerEditorData = {
	pinLayers: ThreeViewerPinLayer[],
	resources: ThreeViewerResources
};

@Component({
	selector: 'app-pin-layer-editor',
	templateUrl: './pin-layer-editor.component.html',
	styleUrls: ['./pin-layer-editor.component.scss']
})
export class PinLayerEditorComponent implements OnInit, OnDestroy {

	@ViewChild("pinPreviewContainer", { read: ElementRef, static: true }) pinPreviewContainer: ElementRef;

	cdkMoveItemInArray = moveItemInArray;

	@Output() pinLayerDeleted: EventEmitter<ThreeViewerPinLayer> = new EventEmitter();

	set selectedLayer(l: ThreeViewerPinLayer) {
		this._selectedLayer = l;
		if (l != null) {
			this.previewMesh.geometry = l.geometry;
			this.previewMesh.material = l.material;
		}
	}

	get selectedLayer(): ThreeViewerPinLayer {
		return this._selectedLayer;
	}

	private _selectedLayer: ThreeViewerPinLayer = null;
	private renderer: WebGLRenderer = null;
	private scene: Scene = new Scene();
	private previewMesh: Mesh = null;
	private camera: PerspectiveCamera = null;
	private light: DirectionalLight = null;
	private orbitControls: OrbitControls = null;

	constructor(private dialogRef: MatDialogRef<PinLayerEditorComponent>, private zone: NgZone, private context: ContextService,
		@Inject(MAT_DIALOG_DATA) public data: PinLayerEditorData) { }

	deleteLayer(l: ThreeViewerPinLayer): void {
		this.data.pinLayers.splice(this.data.pinLayers.findIndex(x => x === l), 1);
		this.pinLayerDeleted.emit(l);
		if (this.selectedLayer === l)
			this.selectedLayer = null;
	}

	ngOnDestroy(): void {
		this.scene = null;
		this.camera = null;
		this.previewMesh = null;
		this.renderer = null;
		this.data = null;
		this.orbitControls.dispose();
	}

	ngOnInit(): void {

		this.renderer = new WebGLRenderer();
		this.renderer.setClearColor(0xcccccc);

		let container: HTMLElement = this.pinPreviewContainer.nativeElement;

		let size = container.getBoundingClientRect();
		let canvas = this.renderer.domElement;

		canvas.style.display = "block";
		canvas.width = size.width;
		canvas.height = size.height;

		container.appendChild(canvas);

		this.previewMesh = new Mesh(new BoxGeometry(1, 1, 1), this.data.resources.createStandardMaterial({ color: 0xffffff }));

		this.light = new DirectionalLight(0xffffff);

		this.scene = new Scene();
		this.scene.add(this.previewMesh);
		this.scene.add(this.light);


		this.camera = new PerspectiveCamera(45);
		this.camera.position.set(0, 0, 3);
		this.camera.lookAt(0, 0, 0);

		this.orbitControls = new OrbitControls(this.camera, canvas);
		this.orbitControls.enablePan = false;

		if (this.data.pinLayers.length > 0)
			this.selectedLayer = this.data.pinLayers[0];

		this.zone.runOutsideAngular(() => this.render());
	}

	newPinLayer(): void {
		let layer = new ThreeViewerPinLayer(this.data.resources);
		layer.title = `PinLayer #${this.data.pinLayers.length}`;
		this.data.pinLayers.push(layer);
	}

	async selectModel(): Promise<void> {
		let fileResult = await this.context.fileChooser({ type: "arraybuffer", accept: ".obj" });

		// Load the first geometry found in the obj file
		let geom = (await this.data.resources.loadGeometryFromWavefront(fileResult.data as ArrayBuffer))[0].geometry;
		this.selectedLayer.geometry.copy(geom);

		// Dispose the loaded geometry
		geom.setIndex(null);
		for (let attr in geom.attributes)
			geom.deleteAttribute(attr)
		geom.dispose();

	}

	private render(): void {

		const container = this.pinPreviewContainer.nativeElement as HTMLElement;
		const [w, h] = [container.clientWidth, container.clientHeight];

		if (!this.renderer)
			return;

		requestAnimationFrame(this.render.bind(this));

		this.light.position.copy(this.camera.position);

		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();

		this.renderer.setViewport(0, 0, w, h);
		this.renderer.clear();
		this.renderer.render(this.scene, this.camera);
	}

}
