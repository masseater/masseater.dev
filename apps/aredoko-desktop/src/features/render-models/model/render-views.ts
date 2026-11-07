import { Array, Effect, Number, Option, pipe } from "effect";
import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import type { Object3D } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { ModelUnreadable } from "./model-unreadable.ts";

const SIZE = 512;
const FIELD_OF_VIEW = 30;
const PITCH = 15;
const FRONT = 0;
const FRONT_SIDE = 45;
const SIDE = 90;
const BACK = 180;
const YAWS = [FRONT, FRONT_SIDE, SIDE, BACK] as const;
const HORIZON = 90;
const SQUARE = 1;
const NEAR_RATIO = 0.01;
const FAR_RATIO = 10;
const HALF = 0.5;
const BACKGROUND = new Color("#525252");
const SKY = new Color("#ffffff");
const GROUND = new Color("#444444");
const AMBIENT = 0.6;
const KEY = 1.5;
const KEY_X = -1;
const KEY_Y = 2;
const KEY_Z = 1.5;
const PNG = "image/png";
const NO_RADIUS = 0;
const ENVIRONMENT_BLUR = 0.04;

interface Stage {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
}

const sceneOf = (object: Object3D, renderer: WebGLRenderer): Scene => {
  const scene = new Scene();
  scene.background = BACKGROUND;
  scene.environment = new PMREMGenerator(renderer).fromScene(
    new RoomEnvironment(),
    ENVIRONMENT_BLUR,
  ).texture;
  const key = new DirectionalLight(SKY, KEY);
  key.position.set(KEY_X, KEY_Y, KEY_Z);
  scene.add(new HemisphereLight(SKY, GROUND, AMBIENT), key, object);
  return scene;
};

const stageOf = (object: Object3D, sphere: Sphere): Stage => {
  const canvas = document.createElement("canvas");
  const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE, false);
  const scene = sceneOf(object, renderer);
  const camera = new PerspectiveCamera(
    FIELD_OF_VIEW,
    SQUARE,
    sphere.radius * NEAR_RATIO,
    sphere.radius * FAR_RATIO,
  );
  return { renderer, scene, camera };
};

const pngOf = (canvas: HTMLCanvasElement): Effect.Effect<Uint8Array, ModelUnreadable> =>
  Effect.callback<Uint8Array, ModelUnreadable>((resume) => {
    canvas.toBlob((blob) => {
      resume(
        pipe(
          Option.fromNullOr(blob),
          Effect.fromOption,
          Effect.flatMap((png) => Effect.promise(() => png.bytes())),
          Effect.mapError((cause) => ModelUnreadable.make({ pathname: PNG, cause })),
        ),
      );
    }, PNG);
  });

const shoot =
  ({ renderer, scene, camera }: Stage, sphere: Sphere) =>
  (yaw: number): Effect.Effect<Uint8Array, ModelUnreadable> => {
    const distance = sphere.radius / Math.sin(MathUtils.degToRad(FIELD_OF_VIEW * HALF));
    const direction = new Vector3().setFromSphericalCoords(
      distance,
      MathUtils.degToRad(Number.subtract(HORIZON, PITCH)),
      MathUtils.degToRad(yaw),
    );
    camera.position.copy(sphere.center).add(direction);
    camera.lookAt(sphere.center);
    renderer.render(scene, camera);
    return pngOf(renderer.domElement);
  };

const boundsOf = (object: Object3D): Option.Option<Sphere> => {
  const sphere = new Box3().setFromObject(object).getBoundingSphere(new Sphere());
  return Option.liftPredicate(
    sphere,
    ({ radius }) => globalThis.Number.isFinite(radius) && radius > NO_RADIUS,
  );
};

/** @internal */
const renderViews = Effect.fn("renderViews")(function* renderViews(object: Object3D) {
  const sphere = boundsOf(object);
  if (Option.isNone(sphere)) {
    return [];
  }
  const stage = yield* Effect.acquireRelease(
    Effect.sync(() => stageOf(object, sphere.value)),
    ({ renderer }) =>
      Effect.sync(() => {
        renderer.dispose();
      }),
  );
  return yield* pipe(YAWS, Array.map(shoot(stage, sphere.value)), Effect.all);
});

export { renderViews };
