const LOOSE_EXTENSIONS = {
  texture: ["png", "jpg", "jpeg", "tga", "psd", "tif", "tiff", "bmp", "exr", "hdr", "gif"],
  model: ["fbx", "obj", "blend", "dae", "3ds", "glb", "gltf", "vrm"],
  audio: ["wav", "mp3", "ogg", "flac", "aif", "aiff"],
} as const;

const ARCHIVE_EXTENSIONS = ["unitypackage", "zip"] as const;

export { ARCHIVE_EXTENSIONS, LOOSE_EXTENSIONS };
