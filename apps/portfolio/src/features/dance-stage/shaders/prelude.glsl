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
vec2 lastJoint(int index) { return lastPose[index].xy; }
float jointDepth(int index) { return pose[index].z; }
float jointVisible(int index) { return pose[index].w; }
vec4 historyTile(vec2 p, float index, float side) {
  index = mod(floor(index), HISTORY_FRAMES);
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
float glyphCell(vec2 p, int row, float index) {
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return 0.0;
  return texture(glyphs, vec2((index + p.x) / 16.0, (float(row) + p.y) / 8.0)).a;
}
float textBox(vec2 p, vec2 center, float height, int row) {
  float aspect = resolution.x / resolution.y;
  vec2 size = vec2(height * textAspect(row) / aspect, height);
  return text((p - center) / size + 0.5, row);
}
float aspect() { return resolution.x / resolution.y; }
vec2 rot(vec2 p, float a) { return mat2(cos(a), sin(a), -sin(a), cos(a)) * p; }
float inside(vec2 p) { return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0); }
vec3 rgbOr(vec2 p, vec3 fill) { return mix(fill, rgb(p), inside(p)); }
vec3 blurRgb(vec2 p, float r) {
  vec3 s = vec3(0);
  for (int i = 0; i < 16; i++) {
    float a = float(i) * 2.399;
    vec2 o = vec2(cos(a), sin(a)) * sqrt((float(i) + 0.5) / 16.0) * r;
    s += rgb(p + o * vec2(1.0 / aspect(), 1.0));
  }
  return s / 16.0;
}
vec3 blurPlate(vec2 p, float r) {
  vec3 s = vec3(0);
  for (int i = 0; i < 16; i++) {
    float a = float(i) * 2.399;
    vec2 o = vec2(cos(a), sin(a)) * sqrt((float(i) + 0.5) / 16.0) * r;
    s += plate(p + o * vec2(1.0 / aspect(), 1.0));
  }
  return s / 16.0;
}
float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = (p - a) * vec2(aspect(), 1.0);
  vec2 ba = (b - a) * vec2(aspect(), 1.0);
  return length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0));
}
float dist(vec2 p, vec2 q) { return length((p - q) * vec2(aspect(), 1.0)); }
vec2 bodyCenter() { return (joint(11) + joint(12) + joint(23) + joint(24)) * 0.25; }
float skeleton(vec2 p) {
  float d = 1e3;
  d = min(d, segment(p, joint(11), joint(12)));
  d = min(d, segment(p, joint(23), joint(24)));
  d = min(d, segment(p, joint(11), joint(23)));
  d = min(d, segment(p, joint(12), joint(24)));
  d = min(d, segment(p, joint(11), joint(13)));
  d = min(d, segment(p, joint(13), joint(15)));
  d = min(d, segment(p, joint(12), joint(14)));
  d = min(d, segment(p, joint(14), joint(16)));
  d = min(d, segment(p, joint(23), joint(25)));
  d = min(d, segment(p, joint(25), joint(27)));
  d = min(d, segment(p, joint(24), joint(26)));
  d = min(d, segment(p, joint(26), joint(28)));
  d = min(d, segment(p, joint(0), (joint(11) + joint(12)) * 0.5));
  return d;
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}
vec3 person(vec2 p, vec3 background) { return mix(background, rgb(p), matte(p)); }
float segmentDigit(vec2 p, int d) {
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return 0.0;
  int bits = d == 0 ? 63 : d == 1 ? 6 : d == 2 ? 91 : d == 3 ? 79 : d == 4 ? 102 : d == 5 ? 109 : d == 6 ? 125 : d == 7 ? 7 : d == 8 ? 127 : 111;
  float w = 0.14;
  float on = 0.0;
  vec2 q = p * vec2(1.0, 2.0);
  if ((bits & 1) != 0) on = max(on, step(abs(q.y - 0.07), w * 0.5) * step(0.12, q.x) * step(q.x, 0.88));
  if ((bits & 2) != 0) on = max(on, step(abs(q.x - 0.93), w * 0.5) * step(0.1, q.y) * step(q.y, 0.95));
  if ((bits & 4) != 0) on = max(on, step(abs(q.x - 0.93), w * 0.5) * step(1.05, q.y) * step(q.y, 1.9));
  if ((bits & 8) != 0) on = max(on, step(abs(q.y - 1.93), w * 0.5) * step(0.12, q.x) * step(q.x, 0.88));
  if ((bits & 16) != 0) on = max(on, step(abs(q.x - 0.07), w * 0.5) * step(1.05, q.y) * step(q.y, 1.9));
  if ((bits & 32) != 0) on = max(on, step(abs(q.x - 0.07), w * 0.5) * step(0.1, q.y) * step(q.y, 0.95));
  if ((bits & 64) != 0) on = max(on, step(abs(q.y - 1.0), w * 0.5) * step(0.12, q.x) * step(q.x, 0.88));
  return on;
}
float number(vec2 p, vec2 origin, float height, float value, int digits) {
  vec2 q = (p - origin) / vec2(height * 0.55 / aspect(), height);
  if (q.y < 0.0 || q.y > 1.0 || q.x < 0.0 || q.x > float(digits)) return 0.0;
  int index = int(floor(q.x));
  float place = pow(10.0, float(digits - 1 - index));
  int d = int(mod(floor(value / place), 10.0));
  return segmentDigit(vec2(fract(q.x) * 1.25 - 0.1, q.y), d);
}
