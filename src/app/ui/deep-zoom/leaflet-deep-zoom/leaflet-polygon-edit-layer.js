"use strict";

import * as L from 'leaflet';

/** @typedef {[number, number][]} DZPoint */

export const LeafletPolygonEditLayer = L.Control.extend({

  /**
   * @type {number}
   */
  _selectedPointIndex: -1,

  /**
   * @type {L.Map}
   */
  _map: null,

  /**
   * @type {HTMLCanvasElement}
   */
  _canvas: null,

  /** @type {DZPoint[]} */
  _points: [],
  initialize(points) {
    L.setOptions(this, { position: "topleft" })
    this._points = points || []
  },
  /**
   * 
   * @param {L.Map} map 
   */
  onAdd(map) {

    if (L.Control.prototype.onAdd)
      L.Control.prototype.onAdd.call(this, map)

    const canvas = L.DomUtil.create("canvas");

    canvas.addEventListener("mousedown", this.mousedown.bind(this))
    canvas.addEventListener("mouseup", this.mouseup.bind(this))
    canvas.addEventListener("mousemove", this.mousemove.bind(this))
    canvas.addEventListener("contextmenu", evt => evt.preventDefault())

    canvas.width = 300
    canvas.height = 400
    canvas.classList.add("m-0")
    canvas.style.backgroundColor = "rgba(0,0,0,.5)"

    this._canvas = canvas
    this._map = map

    this.update()

    map.on("move zoom", (evt) => {
      /** @type {L.Map} */
      const target = evt.target;
      this.update(target)
    })

    return canvas
  },
  /**
   * 
   * @param {L.Map} map 
   */
  onRemove(map) {
  },
  /**
   * 
   * @param {L.Map} map 
   */
  update() {

    window.requestAnimationFrame(() => {
      const scaling = this._getScaling()
      const canvas = this._canvas
      const ctx = canvas.getContext('2d')
      const points = this._points

      canvas.width = this._map.getSize().x
      canvas.height = this._map.getSize().y

      ctx.fillStyle = ctx.strokeStyle = "red"

      ctx.save()
      ctx.scale(scaling.sx, scaling.sy)
      ctx.translate(scaling.x, scaling.y)
      ctx.lineWidth = scaling.lineWidth

      if (points.length >= 3) {
        ctx.beginPath()
        ctx.moveTo(points[0][0], points[0][1])
        points.filter((_, i) => i > 0).forEach(p => ctx.lineTo(p[0], p[1]))
        ctx.closePath()
        ctx.stroke()
      }

      for (let p of points) {
        ctx.beginPath()
        ctx.arc(p[0], p[1], scaling.pointSize, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    })
  },

  /**
   * 
   * @param {MouseEvent} evt 
   */
  mousedown(evt) {
    const idx = this._findPointAtMouse(evt)

    if (idx >= 0) {
      if (evt.button === 0) {
        this._selectedPointIndex = idx
        evt.stopPropagation()
      } else if (evt.button === 2) { // Right
        this._points.splice(idx, 1)
        this.update()
      }
    } else if (evt.button === 1) { // Middle/Wheel
      const p = this._containerToPoint([evt.offsetX, evt.offsetY])
      this._points.push([p.x, p.y])
      this.update()
    }

  },
  mouseup(evt) {
    this._selectedPointIndex = -1
  },
  /**
   * 
   * @param {MouseEvent} evt 
   */
  mousemove(evt) {
    const idx = this._selectedPointIndex
    if (idx !== -1) {
      evt.stopPropagation()
      const target = this._containerToPoint([evt.offsetX, evt.offsetY])
      this._points[idx] = [target.x, target.y]
      this.update()
    }
  },
  /**
   * 
   * @param {[number, number]} coords 
   */
  _containerToPoint(coords) {
    const map = this._map;
    return map.options.crs.latLngToPoint(map.containerPointToLatLng(coords))
  },
  /**
   * 
   * @param {MouseEvent} evt
   * @returns {number|null} 
   */
  _findPointAtMouse(evt) {
    const scaling = this._getScaling()
    const points = this._points
    const mouseLoc = this._containerToPoint([evt.offsetX, evt.offsetY])
    return points.findIndex(p => mouseLoc.distanceTo(p) <= scaling.pointSize)
  },
  _getScaling() {
    const map = this._map
    const size = map.getSize()
    const bounds = map.getBounds()
    const ne = map.options.crs.latLngToPoint(bounds.getNorthWest())
    const sw = map.options.crs.latLngToPoint(bounds.getSouthEast())
    const [x, y] = [-ne.x, -ne.y]
    const [sx, sy] = [
      size.x / (sw.x - ne.x),
      size.y / (sw.y - ne.y),
    ]
    return {
      x, y,
      sx, sy,
      pointSize: 10 / sx,
      lineWidth: 1 / sx
    }
  }
})