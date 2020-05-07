import { Component, OnInit, Inject } from '@angular/core';
import { ThreeViewerModel, ThreeViewerResources } from '../three-viewer';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MeshStandardMaterial } from 'three';
import { ContextService } from 'src/app/context.service';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';


type TextureMap = "map" | "normalMap";

export type MaterialEditorData = {
  model: ThreeViewerModel,
  resources: ThreeViewerResources
}

@Component({
  selector: 'app-material-editor',
  templateUrl: './material-editor.component.html',
  styleUrls: ['./material-editor.component.scss']
})
export class MaterialEditorComponent implements OnInit {

  selectedMaterial: ThreeViewerModel.Material = null;

  constructor(public dialogRef: MatDialogRef<MaterialEditorComponent>, private context: ContextService, @Inject(MAT_DIALOG_DATA) public data: MaterialEditorData,
    public sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.selectedMaterial = this.data.model.materials[0];
  }

  newMaterial(): void {
    let material = this.data.model.addMaterial();
    material.title = "Default";

  }

  deleteMaterial(idx: number) {
    this.data.model.removeMaterial(idx);
  }

  async texture(material: MeshStandardMaterial, texture: TextureMap): Promise<void> {

    if (material[texture]) {
      material[texture] = null;
      material.needsUpdate = true;
    } else {
      let fileResult = await this.context.fileChooser({ type: "arraybuffer", accept: ".png,.jpg,.jpeg,.tga" });
      let url = await this.data.resources.loadArrayBuffer(fileResult.data as ArrayBuffer);
      let tex = await this.data.resources.loadTexture(url);

      material[texture] = tex;
      material.needsUpdate = true;
      tex.premultiplyAlpha = false;
      tex.needsUpdate = true;
    }

  }

}
