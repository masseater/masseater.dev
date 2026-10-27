// note: 数式だけで描いた床と 3 つの玉の空間を、光の通り道を少しずつ進めて描く。玉は拍で弾み、表面には踊りの映像が鏡のように映り込み、奥の壁に踊りを映す。
float scene(vec3 p, out int id) {
  float floor_ = p.y + 1.0;
  id = 0;
  float d = floor_;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float bounce = abs(sin((beatCount + beat + fi * 0.33) * PI * 0.5)) * 0.6;
    vec3 center = vec3((fi - 1.0) * 1.4, -0.4 + bounce, 3.5);
    float s = length(p - center) - 0.6;
    if (s < d) { d = s; id = 1; }
  }
  return d;
}
void main() {
  vec2 q = (uv - 0.5) * vec2(aspect(), -1.0);
  vec3 ro = vec3(0.0, 0.2, -1.5);
  vec3 rd = normalize(vec3(q, 1.2));
  float t = 0.0;
  int id = -1;
  for (int i = 0; i < 64; i++) {
    int hit;
    float d = scene(ro + rd * t, hit);
    if (d < 0.002) { id = hit; break; }
    t += d;
    if (t > 12.0) break;
  }
  vec3 wall = rgb(vec2(uv.x, uv.y * 1.2 - 0.1)) * 0.8;
  vec3 c = wall;
  if (id >= 0) {
    vec3 p = ro + rd * t;
    int dummy;
    vec2 e = vec2(0.002, 0.0);
    vec3 n = normalize(vec3(scene(p + e.xyy, dummy) - scene(p - e.xyy, dummy), scene(p + e.yxy, dummy) - scene(p - e.yxy, dummy), scene(p + e.yyx, dummy) - scene(p - e.yyx, dummy)));
    float diff = max(dot(n, normalize(vec3(-0.5, 0.8, -0.4))), 0.0);
    if (id == 1) {
      vec3 r = reflect(rd, n);
      c = rgb(vec2(0.5 + r.x * 0.5, 0.5 - r.y * 0.5)) * (0.4 + 0.6 * diff) + pow(max(dot(r, normalize(vec3(-0.5, 0.8, -0.4))), 0.0), 30.0);
    } else {
      float checker = step(0.5, fract(floor(p.x) * 0.5 + floor(p.z) * 0.5));
      c = mix(vec3(0.85), vec3(0.3), checker) * (0.3 + 0.7 * diff) * exp(-t * 0.12);
      c = mix(c, wall * 0.3, 0.2);
    }
  }
  outColor = vec4(c, 1.0);
}
