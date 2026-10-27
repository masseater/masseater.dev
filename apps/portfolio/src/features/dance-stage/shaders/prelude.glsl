#version 300 es
precision highp float;
uniform sampler2D dance;
uniform vec2 resolution;
uniform float time;
uniform float frame;
uniform vec3 pose[33];
uniform sampler2D history;
uniform sampler2D glyphs;
uniform float textWidth[8];
uniform float level;
uniform float bands[8];
uniform float beat;
uniform float beatCount;
in vec2 uv;
out vec4 outColor;
const float PI = 3.14159265;
const float DURATION = 28.8;
const float HISTORY_FPS = 15.0;
const float HISTORY_FRAMES = 432.0;
const vec2 HISTORY_GRID = vec2(12.0, 37.0);
vec2 panel(vec2 p, float index) {
  return vec2((clamp(p.x, 0.002, 0.998) + index) / 3.0, clamp(p.y, 0.002, 0.998));
}
vec3 rgb(vec2 p) { return texture(dance, panel(p, 0.0)).rgb; }
float matte(vec2 p) { return smoothstep(0.25, 0.75, texture(dance, panel(p, 1.0)).r); }
vec3 plate(vec2 p) { return texture(dance, panel(p, 2.0)).rgb; }
vec4 read(sampler2D target, vec2 p) { return texture(target, vec2(p.x, 1.0 - p.y)); }
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
vec3 hsv(vec3 c) {
  vec3 k = clamp(abs(mod(c.x * 6.0 + vec3(0, 4, 2), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1), k, c.y);
}
vec2 joint(int index) { return pose[index].xy; }
vec4 historyTile(vec2 p, float index, float side) {
  index = mod(index, HISTORY_FRAMES);
  vec2 cell = vec2(mod(index, HISTORY_GRID.x), floor(index / HISTORY_GRID.x));
  vec2 q = vec2((clamp(p.x, 0.004, 0.996) + side) * 0.5, clamp(p.y, 0.006, 0.994));
  return texture(history, (cell + q) / HISTORY_GRID);
}
vec3 pastRgb(vec2 p, float t) {
  float f = mod(t, DURATION) * HISTORY_FPS;
  return mix(historyTile(p, floor(f), 0.0).rgb, historyTile(p, floor(f) + 1.0, 0.0).rgb, fract(f));
}
float pastMatte(vec2 p, float t) {
  float f = mod(t, DURATION) * HISTORY_FPS;
  return smoothstep(0.25, 0.75, mix(historyTile(p, floor(f), 1.0).r, historyTile(p, floor(f) + 1.0, 1.0).r, fract(f)));
}
float textAspect(int row) { return textWidth[row] * 16.0; }
float text(vec2 p, int row) {
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return 0.0;
  return texture(glyphs, vec2(p.x * textWidth[row], (float(row) + p.y) / 8.0)).a;
}
float textBox(vec2 p, vec2 center, float height, int row) {
  float aspect = resolution.x / resolution.y;
  vec2 size = vec2(height * textAspect(row) / aspect, height);
  return text((p - center) / size + 0.5, row);
}
