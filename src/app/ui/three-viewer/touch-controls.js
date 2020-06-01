import { PerspectiveCamera, Raycaster, Vector3, Clock } from 'three';
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


export class TouchControls {

    /**
     * 
     * @param {PerspectiveCamera} camera 
     * @param {HTMLElement} domElement 
     * @param {NgZone} zone
     */
    constructor(camera, domElement, options) {

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
        this._enabled = true;
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
         */
        this.options = {
            rotationSpeed: options.rotationSpeed || Math.PI,
            zoomDamping: options.zoomDamping || Number.POSITIVE_INFINITY,
            zoomStep: options.zoomStep || 1
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
            // Move the camera towards target location
            let fw = this.camera.getWorldDirection(this.forward);
            moveTowards(this.camera.position, this.targetPosition, this.options.zoomDamping * dt);
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

        if (this.enabled) {

            if (evt.pointers.length === 1) {

                let srcEvent = evt.srcEvent;

                let dx = -srcEvent.movementX / (this.domElement.clientWidth * window.devicePixelRatio * 0.5) * this.options.rotationSpeed;
                let dy = srcEvent.movementY / (this.domElement.clientHeight * window.devicePixelRatio * 0.5) * this.options.rotationSpeed;

                this.raycaster.setFromCamera({
                    x: dx,
                    y: dy
                }, this.camera);

                this.camera.lookAt(this.camera.position.clone().add(this.raycaster.ray.direction));

            } else if (evt.type === "panup" || evt.type === "pandown") {
                let delta = (evt.type === "panup" ? -1 : 1) * this.options.zoomStep;
                let dir = new Vector3();
                this.camera.getWorldDirection(dir);
                this.targetPosition.copy(dir.multiplyScalar(delta).add(this.camera.position));
                console.log(delta);
            }
        }

    }

    /**
     * @returns {void}
     */
    dispose() {
        this.disposed = true;
        this.hammer.destroy();
        this.eventHandlers.dispose();
    }

}