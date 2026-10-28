// note: ローレンツ方程式の軌道をたどり、蝶の羽のような 2 つの輪を描く。全体をゆっくり回して見る向きを変え、歩くたびの速さで線の色を変える。WebGPU では 3 万本あまりの軌道を compute shader で同時に流し、通った回数を光の濃さにする。
void main() {
  vec3 c = rgb(uv) * 0.25;
#ifdef WEBGPU
  vec2 s = splat(uv);
  c += hsv(vec3(fract(0.55 + s.y), 0.7, 1.0)) * (1.0 - exp(-s.x * 0.06));
#else
  vec3 p = vec3(0.1, 0.0, 0.0);
  float a = time * 0.2;
  float d = 9.0;
  float hue = 0.0;
  vec2 prev = vec2(0.0);
  for (int i = 0; i < 600; i++) {
    vec3 v = vec3(10.0 * (p.y - p.x), p.x * (28.0 - p.z) - p.y, p.x * p.y - 8.0 / 3.0 * p.z);
    p += v * 0.007;
    vec2 s = vec2(p.x * cos(a) + p.y * sin(a), p.z - 25.0) * 0.016;
    vec2 at = vec2(0.5 + s.x / aspect(), 0.5 - s.y);
    if (i > 1) {
      float seg = segment(uv, prev, at);
      if (seg < d) { d = seg; hue = length(v) * 0.004; }
    }
    prev = at;
  }
  c += hsv(vec3(fract(0.55 + hue), 0.7, 1.0)) * smoothstep(0.003, 0.0, d);
#endif
  outColor = vec4(c, 1.0);
}
