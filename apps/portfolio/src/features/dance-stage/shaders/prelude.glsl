#version 300 es
precision highp float;
uniform sampler2D dance;
uniform vec2 resolution;
uniform float time;
uniform float frame;
uniform vec3 pose[33];
in vec2 uv;
out vec4 outColor;
const float PI = 3.14159265;
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
