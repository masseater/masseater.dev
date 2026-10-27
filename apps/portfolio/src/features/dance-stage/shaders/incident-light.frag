// note: 画面の右上の外にある光源から光が差し込んだように、右上を白く飛ばし、斜めの光の帯と、光源側の輪郭のにじみを足す。
void main() {
  vec2 source = vec2(1.1, -0.15);
  vec3 c = rgb(uv);
  float d = dist(uv, source);
  c += vec3(1.0, 0.9, 0.75) * exp(-d * 2.2) * 0.9;
  vec2 dir = normalize((uv - source) * vec2(aspect(), 1.0));
  float a = atan(dir.y, dir.x);
  float rays = smoothstep(0.6, 1.0, sin(a * 18.0 + time * 0.3)) * exp(-d * 1.3);
  c += vec3(1.0, 0.95, 0.85) * rays * 0.35;
  float rim = matte(uv) * (1.0 - matte(uv + vec2(0.006, -0.008)));
  c += vec3(1.0, 0.9, 0.7) * rim * exp(-d * 1.0) * 1.2;
  outColor = vec4(c, 1.0);
}
