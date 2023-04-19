import { PerspectiveCamera, Raycaster, Vector3, Clock, Scene } from 'three';
import * as hammer from "hammerjs";

/**
 * 
 * @param {Vector3} pos 
 * @param {Vector3} target 
 * @param {number} maxSpeed 
 */
const moveTowards = function (pos, target, maxSpeed) {

	maxSpeed = maxSpeed || 0;

	let len = pos.distanceToSquared(target);

	if (len <= maxSpeed * maxSpeed) {
		pos.copy(target);
	} else {
		let dir = target.clone().sub(pos).normalize();
		pos.add(dir.multiplyScalar(maxSpeed));
	}

	return Math.sqrt(Math.min(len, maxSpeed * maxSpeed));
}


class EventHandlers {
	constructor() {
		/**
		 * @private
		 * @property {Array} handlers
		 */
		this.handlers = [];
	}

	/**
	 * 
	 * @param {string} evtName 
	 * @param {HTMLElement} target 
	 * @param {Function} handler 
	 */
	bind(evtName, target, handler) {

		target.addEventListener(evtName, handler);

		this.handlers.push({
			evtName: evtName,
			target: target,
			handler: handler
		});

	}

	dispose() {
		for (let h of this.handlers) {
			h.target.removeEventListener(h.evtName, h.handler);
		}
	}
}

export class TouchControlBounds {
	constructor() {
		this.objects = [];
		this.raycaster = new Raycaster();
		this.raycaster.far = 1;
	}

	set(...objs) {
		this.objects = objs.slice();
	}

	clear() {
		this.objects = [];
	}

	test(pos, dir, length) {

		this.raycaster.set(pos, dir);
		this.raycaster.far = length;

		let intersections = this.raycaster.intersectObjects(this.objects, true);

		if (intersections.length > 0) {
			return new Vector3().copy(intersections[0].face.normal).multiplyScalar(0.01).add(intersections[0].point)
		} else {
			return null;
		}

	}

	dispose() {
		this.objects = null;
		this.raycaster = null;
	}


}


class EventDispatcher {

	constructor() {
		this._handlers = [];
	}

	addEventListener(event, handler) {
		this._handlers.push({
			event: event,
			handler: handler
		});
	}

	dispatch(event, ...params) {
		this._handlers
			.filter(x => x.event === event)
			.map(x => x.handler)
			.forEach(h => h(...params));
	}


	dispose() {
		this._handlers = [];
	}

}


export class TouchControls extends EventDispatcher {

	/**
	 * 
	 * @param {PerspectiveCamera} camera 
	 * @param {HTMLElement} domElement 
	 * @param {NgZone} zone
	 */
	constructor(camera, domElement, options) {

		super();

		if (!options)
			options = {}

		/**
		 * @property {PerspectiveCamera} camera
		 */
		this.camera = camera;

		/**
		 * @property {HTMLElement} domElement
		 */
		this.domElement = domElement;

		/**
		 * @property {boolean} enabled
		 */
		this._enabled = false;
		Object.defineProperty(this, "enabled", {
			set: function (value) {
				if (value && !this._enabled)
					this.targetPosition.copy(this.camera.position);
				this._enabled = value;
			},
			get: function () {
				return this._enabled;
			}
		});

		/**
		 * @property {object} options
		 * @property {number} options.rotationSpeed How fast can the camera rotate. Base value should be 1.0
		 * @property {number} options.zoomDamping How fast can the camera move each frame towards the target. A value of Infinity, means
		 * that the camera will always reach the target in 1 frame
		 * @property {number} options.zoomStep How far to move the camera target each time the mouse wheel is scrolls or the double touch pan is
		 * detected. A value of 1 means that the target is moved 1 unit away from the current camera position for each zoom event
		 */
		this.options = {
			rotationSpeed: options.rotationSpeed,
			zoomDamping: options.zoomDamping,
			zoomStep: options.zoomStep
		}

		/**
		 * @private
		 * @property {Vector3} targetPosition 
		 */
		this.targetPosition = new Vector3().copy(camera.position);

		/**
		 * @private
		 * @property {Raycaster} raycaster
		 */
		this.raycaster = new Raycaster();

		/**
		 * @private
		 * @property {Clock} clock
		 */
		this.clock = new Clock(true);


		/**
		 * @private
		 * @property {boolean} disposed
		 */
		this.disposed = false;


		/**
		 * @private
		 * @property {EventHandlers} eventHandlers
		 */
		this.eventHandlers = new EventHandlers();


		/**
		 * @public
		 * @property {TouchControlBounds} bounds
		 */
		this.bounds = new TouchControlBounds();

		/**
		 * @private
		 * @property {hammer.Hammer} hammer
		 */
		this.hammer = new hammer(this.domElement);

		// Setup hammer
		this.hammer.get("pan").set({ direction: hammer.DIRECTION_ALL, pointers: 0 });

		this.hammer.on("panstart panend panup pandown panleft panright", this.onPan.bind(this));

		// Setup mouse/keyboard events
		this.eventHandlers.bind("wheel", this.domElement, this.onMouseWheel.bind(this));

		this.forward = new Vector3();
		this.right = new Vector3();
		this.up = new Vector3(0, 1, 0);

		// Run
		this.onAnimationFrame();
	}


	onAnimationFrame() {
		if (this.disposed)
			return;

		requestAnimationFrame(this.onAnimationFrame.bind(this));

		let dt = this.clock.getDelta();

		if (this.enabled) {
			// Calculcate the new camera position based on the target, the elapsed time and the zoom damping.
			let pos = this.camera.position.clone();
			let len = moveTowards(pos, this.targetPosition, this.options.zoomDamping * dt);

			let dir = pos.clone().sub(this.camera.position).normalize();



			if (len > 0) {

				let intersection = this.bounds.test(this.camera.position, dir, len);

				if (intersection) {
					// If there's an intersection with the boundary, we want to force the camera to stay
					// at the intersection point and not move further. 
					// This means we also have to reset the target to the current camera position
					this.camera.position.copy(intersection);
					this.targetPosition.copy(intersection);
				} else {
					// If there's no intersection with the boundary we move the camera to the new position
					this.camera.position.copy(pos);
				}

			}


		}

	}

	/**
	 * 
	 * @param {WheelEvent} evt 
	 */
	onMouseWheel(evt) {

		if (this.enabled) {
			let delta = -Math.sign(evt.deltaY) * this.options.zoomStep;
			let dir = new Vector3();
			this.camera.getWorldDirection(dir);
			this.targetPosition.copy(dir.multiplyScalar(delta).add(this.camera.position));
		}
	}

	/**
	 * @private
	 * @param {hammer.Event} evt 
	 * @returns {void}
	 */
	onPan(evt) {

		const ZOOM_SPEED_TO_PAN = 50;

		if (this.enabled) {


			if (evt.pointers.length === 1) {

				let srcEvent = evt.srcEvent;

				//let dx = -srcEvent.movementX / (this.domElement.clientHeight * window.devicePixelRatio * 0.5) * this.options.rotationSpeed;
				//let dy = srcEvent.movementY / (this.domElement.clientHeight * window.devicePixelRatio * 0.5) * this.options.rotationSpeed;

				if (srcEvent.altKey) {
					const dx = -srcEvent.movementX / this.domElement.clientHeight * this.options.zoomStep * ZOOM_SPEED_TO_PAN;
					const dy = srcEvent.movementY / this.domElement.clientHeight * this.options.zoomStep  * ZOOM_SPEED_TO_PAN;

					const forward = new Vector3();
					this.camera.getWorldDirection(forward);
					const up = new Vector3(0, 1, 0);
					const right = forward.clone().cross(up);
					const offset = right.multiplyScalar(dx).add(up.multiplyScalar(dy));
					this.targetPosition.copy(offset.add(this.camera.position));

				} else {
					let dx = -srcEvent.movementX / this.domElement.clientHeight * this.options.rotationSpeed * 2.0 * Math.PI;
					let dy = srcEvent.movementY / this.domElement.clientHeight * this.options.rotationSpeed * 2.0 * Math.PI;

					this.raycaster.setFromCamera({
						x: dx,
						y: dy
					}, this.camera);

					this.camera.lookAt(this.camera.position.clone().add(this.raycaster.ray.direction));

				}
				this.dispatch("change", this);

			}
			else if (evt.type === "panup" || evt.type === "pandown") {
				let delta = (evt.type === "panup" ? -1 : 1) * this.options.zoomStep;
				let dir = new Vector3();
				this.camera.getWorldDirection(dir);
				this.targetPosition.copy(dir.multiplyScalar(delta).add(this.camera.position));
			}
		}

	}

	/**
	 * Updates the target positon with the current camera position
	 * @returns {void}
	 */
	update() {
		this.targetPosition.copy(this.camera.position);
	}

	/**
	 * @returns {void}
	 */
	dispose() {
		this.disposed = true;
		this.hammer.destroy();
		this.eventHandlers.dispose();
		this.bounds.dispose();
	}

}