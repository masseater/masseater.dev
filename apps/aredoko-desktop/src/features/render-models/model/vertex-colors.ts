import { Array } from "effect";
import { Mesh, MeshPhongMaterial, MeshStandardMaterial } from "three";
import type { Material, Object3D } from "three";

const isTextured = (material: Material): boolean =>
  (material instanceof MeshPhongMaterial || material instanceof MeshStandardMaterial) &&
  material.map !== null;

const withoutVertexColors = (material: Material): void => {
  if (isTextured(material)) {
    material.vertexColors = false;
    material.needsUpdate = true;
  }
};

const isMesh = (object: Object3D): object is Mesh => object instanceof Mesh;

const ignoreVertexColorsOnTextures = (object: Object3D): void => {
  object.traverse((child) => {
    if (!isMesh(child)) {
      return;
    }
    for (const material of Array.ensure(child.material)) {
      withoutVertexColors(material);
    }
  });
};

export { ignoreVertexColorsOnTextures };
