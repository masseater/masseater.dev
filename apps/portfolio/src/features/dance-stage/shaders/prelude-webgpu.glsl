layout(std430, set = 0, binding = 0) readonly buffer FrameBlock {
  vec4 pose[33];
  vec4 lastPose[33];
  float bands[8];
  float textWidth[8];
  vec2 resolution;
  float time;
  float frame;
  float level;
  float beat;
  float beatCount;
};
layout(set = 0, binding = 1) uniform sampler linearSampler;
layout(set = 0, binding = 2) uniform texture2D danceTexture;
layout(set = 0, binding = 3) uniform texture2D historyTexture;
layout(set = 0, binding = 4) uniform texture2D glyphsTexture;
layout(std430, set = 0, binding = 5) readonly buffer DensityBlock {
  uint density[];
};
#define dance sampler2D(danceTexture, linearSampler)
#define history sampler2D(historyTexture, linearSampler)
#define glyphs sampler2D(glyphsTexture, linearSampler)
#define read(target, p) texture(target, p)
layout(location = 0) in vec2 uv;
layout(location = 0) out vec4 outColor;
vec2 splat(vec2 p) {
  ivec2 q = ivec2(clamp(p, 0.0, 0.9999) * vec2(DENSITY_WIDTH, DENSITY_HEIGHT));
  int i = (q.y * DENSITY_WIDTH + q.x) * 2;
  float w = float(density[i]);
  return vec2(w / 256.0, float(density[i + 1]) / max(w, 1.0) / 255.0);
}
