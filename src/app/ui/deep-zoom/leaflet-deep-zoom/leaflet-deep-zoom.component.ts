import { Component, OnInit, OnChanges, Input, ViewChild, ElementRef, SimpleChanges, OnDestroy, TemplateRef } from '@angular/core';
import { ContextService } from 'src/app/context.service';
import * as L from 'leaflet';
import { DeepZoomItem, DeepZoomItemDeepImageLayer, DeepZoomItemLayer, DeepZoomItemLayerGroup, DeepZoomItemLayerType, DeepZoomItemPolygon, DeepZoomItemShape, DeepZoomItemVectorLayer } from 'src/app/types/deep-zoom-item';
import { DeepZoomLayerControls, DeepZoomTools, DeepZoomMeasureUnit, DeepZoomLayerControlsDefaults, measure } from '../deep-zoom';
import { LeafletDeepImageLayer } from './leaflet-deep-image-layer';
import { LeafletMeasureLayer } from './leaflet-measure-layer';
import { NavigatorTrackBounds, NavigatorPanEvent } from '../navigator/navigator.component';
import { LocationRouterService } from 'src/app/location-router.service';
import { State } from 'src/app/classes/state';
import { LocalizedText } from 'src/app/types/item';
import { ItemSave } from '../../item/item.component';
import { ContentProviderService, ModusOperandiContentProviderService, ModusOperandiFileProps, ModusOperandiInfoFile } from 'src/app/content-provider.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { filter, skip } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { LeafletPolygonEditLayer } from './leaflet-polygon-edit-layer';
import { v4 as uuidv4 } from 'uuid';
import getServer from 'src/server';
import { ModusOperandiFileFilter, ModusOperandiFilePickerComponent } from '../../file-input/modus-operandi-file-picker/modus-operandi-file-picker.component';



const MEASURE_LAYER_PANE = "dz-measure-pane";

type EditorModeData = {
	selectedLayer?: DeepZoomItemDeepImageLayer | DeepZoomItemVectorLayer,
	selectedGroup?: DeepZoomItemLayerGroup
}

interface LeafletLayerControls extends DeepZoomLayerControls {
	nativeLayer: L.Layer;
	update(): void;
}

@Component({
	selector: 'app-leaflet-deep-zoom',
	templateUrl: './leaflet-deep-zoom.component.html',
	styleUrls: ['./leaflet-deep-zoom.component.scss']
})
export class LeafletDeepZoomComponent implements OnInit, OnDestroy, OnChanges, ItemSave {

	@ViewChild("polygonEditorMap", { static: false, read: ElementRef }) polygonEditorMap: ElementRef;
	@ViewChild("polygonEditorTmpl", { static: true, read: TemplateRef }) polygonEditorTmpl: TemplateRef<any>;
	@ViewChild("mapContainer", { static: true }) mapContainer: ElementRef;
	@ViewChild("popupElement", { static: true }) popupElement: ElementRef;

	@Input() item: DeepZoomItem = null;

	editorMode: EditorModeData = {}

	activeShape: DeepZoomItemShape;

	map: L.Map = null;
	layerControls: LeafletLayerControls[] = null;
	measureLayer: LeafletMeasureLayer = null;
	navigatorBounds: NavigatorTrackBounds = null;
	showLayers: boolean = true;
	isModusOperandiServer = getServer().type === "modus-operandi"

	_tool: DeepZoomTools = "pan";
	_measureUnit: DeepZoomMeasureUnit = "centimeters";
	_subscription: Subscription;

	constructor(public context: ContextService, private dialog: MatDialog, private contentProvider: ContentProviderService, private router: LocationRouterService, private state: State) { }


	get viewportAspectRatio(): number {
		return this.item.options.viewport.width / this.item.options.viewport.height;
	}

	set measureUnit(m: DeepZoomMeasureUnit) {
		this._measureUnit = m;
		this.tool = "measure";
	}

	get measureUnit(): DeepZoomMeasureUnit {
		return this._measureUnit;
	}

	set tool(t: DeepZoomTools) {
		this._tool = t;

		switch (t) {
			case "measure":
				this.map.dragging.disable();
				if (!this.map.hasLayer(this.measureLayer))
					this.map.addLayer(this.measureLayer);
				break;
			case "pan":
				this.map.dragging.enable();
				this.map.removeLayer(this.measureLayer);
				break;
		}

	}

	get tool(): DeepZoomTools {
		return this._tool;
	}

	get formattedZoom(): string {
		return ((100 * Math.pow(2, this.map.getZoom())).toFixed(0) + "%");
	}

	ngOnInit() {
		this._subscription = this.context.editorMode.pipe(skip(1)).subscribe({
			next: v => {
				// FIXME: It seems that leaflet checks if the container is visible or not, that's why I have to add a timeout
				// UPDATE: So the problem is that leflet checks the size of the container (clientWidth), and if the container is hidden (dislay=none)
				// then clientWidth=clientHeight=0. For now I'll use animation frame instead of a timeout
				if (v === false)
					window.requestAnimationFrame(() => this.createMap())
			}
		})
	}

	ngOnDestroy(): void { this._subscription.unsubscribe() }

	ngOnChanges(changes: SimpleChanges) {
		if (changes["item"]) {
			const c = changes["item"];
			if (c.previousValue !== c.currentValue && c.currentValue) {
				this.createMap();
				this.showLayers = this.item.options.showLayers !== undefined ? this.item.options.showLayers : true;
			}
		}
	}

	save(): Promise<any> {
		return this.contentProvider.storeItem(this.item);
	}

	onLayerDrop(evt: CdkDragDrop<any>) {
		moveItemInArray(this.item.layers, evt.previousIndex, evt.currentIndex)
	}



	getDescriptionAsArray(description: LocalizedText | LocalizedText[]): LocalizedText[] {
		return description instanceof Array ? description : [description];
	}

	updateNavigatorBounds(): void {
		let bounds = this.map.getBounds();
		let worldBounds = L.bounds(this.latLngToPoint(bounds.getNorthEast(), 0), this.latLngToPoint(bounds.getSouthWest(), 0));

		this.navigatorBounds = {
			left: worldBounds.min.x,
			top: worldBounds.min.y,
			right: worldBounds.max.x,
			bottom: worldBounds.max.y,
		};
	}

	toggleLayerVisibility(l: LeafletLayerControls): void {
		let visible = !l.visible;

		if (visible && this.item.layerGroups) {
			this.item.layerGroups.filter(g => g.exclusive && g.layers.includes(l.name)).forEach(g => {
				this.layerControls.filter(l2 => g.layers.includes(l2.name)).forEach(l2 => l2.visible = false);
			})
		}

		l.visible = visible;
		this.updateLayers();
	}


	updateLayers(): void {
		let zoom = this.map.getZoom();
		this.layerControls.forEach(l => {

			if (l.maxZoom >= zoom && l.minZoom <= zoom) {
				l.nativeLayer.getPane().style.display = l.visible ? "block" : "none"
			} else {
				l.nativeLayer.getPane().style.display = "none";
			}

		});

		this.layerControls.filter(l => l.visible).reverse().forEach((l, i) => {
			l.nativeLayer.getPane().style.zIndex = i + "";
			l.update();
		})
	}

	resetCamera(options: object = {}): void {
		let viewport = this.item.options.viewport;
		this.map.setView(this.pointToLatLng(viewport.width / 2, viewport.height / 2, 0), this.map.getMinZoom());
	}


	onNavigatorPan(evt: NavigatorPanEvent): void {
		this.map.panTo(this.pointToLatLng(evt.x, evt.y, 0), { animate: false });
	}

	onPolygonEditorTabChange(evt: MatTabChangeEvent, points: [number, number][]) {
		if (evt.index === 1)
			this.createPolygonEditorMap(points);
	}

	destroyPolygonEditorMap(): void {
		const element = this.polygonEditorMap.nativeElement
		let map: L.Map = element._mapRef

		if (map) {
			map.off()
			map.remove()
			element._mapRef = null;
		}
	}

	createPolygonEditorMap(points: [number, number][]): void {
		const element = this.polygonEditorMap.nativeElement
		let map: L.Map = element._mapRef

		if (map)
			return;

		map = L.map(element, {
			center: [0, 0],
			zoom: 0,
			crs: L.CRS.Simple,
			renderer: L.svg({ padding: 1 }),
			zoomControl: false,
			zoomAnimation: true,
			zoomSnap: 0,
			zoomDelta: 0.1
		})
		element._mapRef = map

		this.item.layers.forEach((layerDef, i) => {
			if (layerDef.type === "deep-image") {

				let pane = `dz-pane-${i++}`
				map.createPane(pane)

				let layer = new LeafletDeepImageLayer({
					pane: pane,
					bounds: L.latLngBounds(
						this.pointToLatLng(0, 0, 0),
						this.pointToLatLng(this.item.options.viewport.width, this.item.options.viewport.height, 0)
					),
					minZoom: layerDef.minZoom,
					maxZoom: layerDef.maxZoom,
					cnTileSize: layerDef.tileSize,
					cnViewportWidth: this.item.options.viewport.width,
					cnViewportHeight: this.item.options.viewport.height,
					cnWidth: layerDef.width,
					cnHeight: layerDef.height,
					cnTileOverlap: layerDef.tileOverlap,
					cnImageSrc: this.router.resolve(layerDef.imageSrc, this.item),
					cnImageFormat: layerDef.imageFormat
				})

				map.addLayer(layer)

			}
		})

		// Create edit layer
		new LeafletPolygonEditLayer(points).addTo(map);

		// Set the minimum zoom
		let bounds = L.latLngBounds(
			this.pointToLatLng(0, 0, 0),
			this.pointToLatLng(this.item.options.viewport.width, this.item.options.viewport.height, 0)
		);

		map.setMinZoom(map.getBoundsZoom(bounds, false));

		let viewport = this.item.options.viewport;
		map.setView(this.pointToLatLng(viewport.width / 2, viewport.height / 2, 0), map.getMinZoom());
	}

	async selectDeepZoomFromModusOperandi(): Promise<ModusOperandiInfoFile> {
		const moContentProvider = this.contentProvider as ModusOperandiContentProviderService

		const fileFilter: ModusOperandiFileFilter = (f: ModusOperandiFileProps) => {
			return f.type === "DeepZoomLink" || f.deepZoom?.deepZoom === true
		}

		const ref = this.dialog.open(ModusOperandiFilePickerComponent, {
			position: {
				top: "100px"
			},
			width: "90%",
			maxWidth: "1280px"
		})
		ref.componentInstance.fileFilter = fileFilter

		const result = await ref.afterClosed().toPromise()
		if (result) {
			const info = await moContentProvider.infoFile(result[0])
			return info
		}
		return null
	}

	async importDeepZoomFromModusOperandi() {
		const deepZoomInfo = await this.selectDeepZoomFromModusOperandi()
		const moContentProvider = this.contentProvider as ModusOperandiContentProviderService
		if (deepZoomInfo) {
			for (let layer of deepZoomInfo.deepZoom.layers) {
				const layerDef: DeepZoomItemDeepImageLayer = {
					type: "deep-image",
					id: uuidv4(),
					title: layer.name,
					height: layer.height,
					width: layer.width,
					imageFormat: layer.extension,
					// The 8th level is always 256px, good for the preview. Adding "content" in front because path starts with "/root.{f}/...."
					previewImage: moContentProvider.getUrl(`content${layer.path}/8/0_0.${layer.extension}`),
					imageSrc: moContentProvider.getUrl(`content${layer.path}`),
					tileOverlap: layer.overlap,
					tileSize: layer.tileSize,
					visible: true,
					opacityControl: true,
					opacity: 1,
					minZoom: -Math.ceil(Math.log2(Math.max(layer.width, layer.height))),
					maxZoom: 0,
				}
				this.item.layers.push(layerDef)
			}
		}
	}

	addLayerToGroup(group: DeepZoomItemLayerGroup, layerId: string) {
		const idx = group.layers.findIndex(l => l === layerId)
		if (idx === -1)
			group.layers.push(layerId)
	}

	removeLayerFromGroup(group: DeepZoomItemLayerGroup, layerId: string) {
		const idx = group.layers.findIndex(l => l === layerId)
		if (idx >= 0)
			group.layers.splice(idx, 1)
	}

	addLayerGroup() {
		const grp: DeepZoomItemLayerGroup = {
			id: uuidv4(),
			title: "Group",
			exclusive: false,
			layers: []
		}
		this.item.layerGroups.push(grp)
	}

	deleteGroup(grp: DeepZoomItemLayerGroup) {
		this.item.layerGroups = this.item.layerGroups.filter(g => g !== grp)
	}

	// TODO: pass layer directly maybe?
	deleteLayer(idx: number) {
		const layerId = this.item.layers[idx].id
		this.item.layers.splice(idx, 1)
		this.item.layerGroups.forEach(group => group.layers = group.layers.filter(id => id !== layerId))
	}


	addLayer(type: DeepZoomItemLayerType) {
		if (type === 'vector') {
			const layerDef: DeepZoomItemVectorLayer = {
				id: uuidv4(),
				shapes: [],
				type: "vector",
				title: "Vector Layer",
				color: "#000000",
				opacityControl: true,
				opacity: 1,
				visible: true
			}
			this.item.layers.push(layerDef)
		} else if (type === 'deep-image') {

			const layerDef: DeepZoomItemDeepImageLayer = {
				type: "deep-image",
				id: uuidv4(),
				width: this.item.options.viewport.width,
				height: this.item.options.viewport.height,
				imageFormat: "jpg",
				imageSrc: "",
				tileOverlap: 1,
				tileSize: 256,
				title: "Deep Image Layer",
				color: "#ffffff",
			}

			this.item.layers.push(layerDef)

		}
	}

	createMap(): void {

		if (this.map) {
			this.map.off()
			this.map.remove()
		}

		this.map = L.map(this.mapContainer.nativeElement, {
			attributionControl: false,
			center: [0, 0],
			zoom: 0,
			crs: L.CRS.Simple,
			renderer: L.svg({ padding: 1 }),
			zoomControl: false,
			zoomAnimation: true,
			zoomSnap: 0,
			zoomDelta: 0.1
		});

		// Setup map listeners 
		this.map.on("move", () => {
			this.updateNavigatorBounds();
			this.saveState();
		});

		this.map.on("zoom", () => {
			this.updateNavigatorBounds();
			this.updateLayers();
			this.saveState();
		});

		// Create the layers
		this.createLayers();
		this.updateLayers();

		// Set the minimum zoom
		let bounds = L.latLngBounds(
			this.pointToLatLng(0, 0, 0),
			this.pointToLatLng(this.item.options.viewport.width, this.item.options.viewport.height, 0)
		);

		this.map.setMinZoom(this.map.getBoundsZoom(bounds));


		// Set tool 
		this.tool = this._tool;

		let state = this.state.getState();

		if (state) {
			this.map.setView(state.center, state.zoom);
		} else {
			// Reset the camera
			this.resetCamera();
		}


	}


	private createLayers(): void {

		this.layerControls = [];
		let i = 0;

		this.item.layers.forEach(layerSpec => {

			let layerControls: LeafletLayerControls = null;
			let pane = `dz-pane-${i++}`;

			this.map.createPane(pane);

			if (layerSpec.type === "deep-image") {
				layerControls = this.createDeepImageLayer(layerSpec, pane);
			} else if (layerSpec.type === "vector") {
				layerControls = this.createVectorLayer(layerSpec, pane);
			}

			if (layerControls) {
				this.map.addLayer(layerControls.nativeLayer);
				this.layerControls.push(layerControls);
			}
		});

		// Measure layer
		{
			this.measureLayer = new LeafletMeasureLayer({
				pane: MEASURE_LAYER_PANE,
				measure: (p0, p1) => {
					let distance = this.map.options.crs.distance(p0, p1);
					return measure(distance, this.measureUnit, this.item.options.viewport.dpi).toFixed(2);
				}
			});
			this.map.createPane(MEASURE_LAYER_PANE).style.zIndex = this.layerControls.length + "";
		}

	}



	private pointToLatLng(x: number, y: number, z: number): L.LatLng {
		return this.map.options.crs.pointToLatLng(L.point(x, y), z);
	}

	private latLngToPoint(latlng: L.LatLng, zoom: number): L.Point {
		return this.map.options.crs.latLngToPoint(latlng, zoom);
	}

	private createDeepImageLayer(layerSpec: DeepZoomItemDeepImageLayer, pane: string): LeafletLayerControls {

		let result = this.context.assign({}, DeepZoomLayerControlsDefaults, {
			id: layerSpec.id,
			title: layerSpec.title,
			opacity: layerSpec.opacity,
			opacityControl: layerSpec.opacityControl,
			visible: layerSpec.visible,
			minZoom: layerSpec.minZoom,
			maxZoom: layerSpec.maxZoom,
			previewImage: layerSpec.previewImage,
			color: layerSpec.color,
			nativeLayer: null,
			update: function () { this.nativeLayer.setOpacity(this.opacity); }
		})

		result.nativeLayer = new LeafletDeepImageLayer({
			cnDebug: true,
			pane: pane,
			bounds: L.latLngBounds(
				this.pointToLatLng(0, 0, 0),
				this.pointToLatLng(this.item.options.viewport.width, this.item.options.viewport.height, 0)
			),
			minZoom: result.minZoom,
			maxZoom: result.maxZoom,
			cnTileSize: layerSpec.tileSize,
			cnViewportWidth: this.item.options.viewport.width,
			cnViewportHeight: this.item.options.viewport.height,
			cnWidth: layerSpec.width,
			cnHeight: layerSpec.height,
			cnTileOverlap: layerSpec.tileOverlap,
			cnImageSrc: this.router.resolve(layerSpec.imageSrc, this.item),
			cnImageFormat: layerSpec.imageFormat
		});

		return result;
	}


	private createVectorLayer(layerSpec: DeepZoomItemVectorLayer, pane: string): LeafletLayerControls {
		let nativeLayer = L.layerGroup([], { pane: pane });

		for (let s of layerSpec.shapes) {
			let shape: L.Polygon = null;

			if (s.type === "polygon" && s.points.length > 2) {
				shape = L.polygon(s.points.map(p => this.pointToLatLng(p[0], p[1], 0)), { pane: pane });
			}

			shape.options.fillOpacity = 1;

			if (shape) {

				shape.on("click", evt => {
					this.activeShape = s;
					const popup = L.popup({
						content: this.popupElement.nativeElement,
						maxWidth: 768
					}, shape)
						.setLatLng(shape.getBounds().getCenter().clone())
					setTimeout(() => popup.addTo(this.map), 0);
				});

				shape.setStyle({
					fill: s.drawAttributes.fill,
					fillColor: s.drawAttributes.fillColor || "#fff",
					stroke: s.drawAttributes.stroke,
					color: s.drawAttributes.strokeColor || "#000"
				});
				nativeLayer.addLayer(shape);
			}
		}

		return this.context.assign({}, DeepZoomLayerControlsDefaults, {
			id: layerSpec.id,
			title: layerSpec.title,
			opacity: layerSpec.opacity,
			opacityControl: layerSpec.opacityControl,
			visible: layerSpec.visible,
			minZoom: layerSpec.minZoom,
			maxZoom: layerSpec.maxZoom,
			previewImage: layerSpec.previewImage,
			color: layerSpec.color,
			nativeLayer: nativeLayer,
			update: function () { this.nativeLayer.getPane().style.opacity = this.opacity + ""; }
		})


	}

	editPolygon(shape: DeepZoomItemPolygon) {
		const ref = this.dialog.open(this.polygonEditorTmpl, {
			data: shape,
			width: "100%",
			height: "100%",
			maxWidth: "1024px",
			maxHeight: "768px"
		});

		ref.afterClosed().subscribe({
			next: () => this.destroyPolygonEditorMap()
		})
	}

	addShapeToVectorLayer(layer: DeepZoomItemVectorLayer) {


		const shape: DeepZoomItemPolygon = {
			type: "polygon",
			title: `Poygon#${layer.shapes.length}`,
			drawAttributes: {
				fill: true,
				stroke: true,
				fillColor: "rgba(255,255,255,.5)",
				strokeColor: "white"
			},
			points: []
		}

		layer.shapes = [...layer.shapes, shape]

	}


	private saveState(): void {

		let center = this.map.getBounds().getCenter();

		let state = {
			zoom: this.map.getZoom(),
			center: [center.lat, center.lng]
		};

		this.state.saveState(state);

	}
}