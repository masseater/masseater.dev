// note: 踊る人を切り抜いて、周りをカメラの輪が囲む撮影台の上に立たせる。体は板のように回り、後ろ向きになると左右が裏返るので、取り込んだ立体を回して見ているように見える。
void main() {
  vec3 c = mix(vec3(0.03, 0.05, 0.08), vec3(0.08, 0.1, 0.16), uv.y);
  vec2 floorC = vec2(0.5, 0.9);
  vec2 fd = (uv - floorC) * vec2(aspect(), 4.0);
  float ring = abs(length(fd) - 0.45);
  c += vec3(0.2, 0.6, 0.9) * smoothstep(0.02, 0.0, ring);
  c += vec3(0.1, 0.2, 0.3) * step(length(fd), 0.45) * step(0.95, fract(atan(fd.y, fd.x) * 4.0));
  float spin = time * 0.5;
  float squash = cos(spin);
  squash = sign(squash) * max(abs(squash), 0.2);
  vec2 center = vec2(bodyCenter().x, 0.5);
  float x = (uv.x - center.x) / max(abs(squash), 0.05);
  vec2 p = vec2(center.x + x, uv.y);
  float back = step(squash, 0.0);
  p.x = mix(p.x, 2.0 * center.x - p.x, back);
  float m = matte(p) * inside(p);
  vec3 body = rgb(p) * mix(1.0, 0.75, back);
  body += vec3(0.1, 0.25, 0.35) * step(0.5, fract(uv.y * 160.0)) * 0.3;
  c = mix(c, body, m);
  for (int i = 0; i < 10; i++) {
    float a = float(i) / 10.0 * 2.0 * PI + 0.2;
    vec2 foot = floorC + vec2(cos(a) * 0.55 / aspect(), sin(a) * 0.55 / 4.0);
    vec2 cam = foot - vec2(0.0, 0.3);
    float d = dist(uv, cam);
    c = mix(c, vec3(0.35), smoothstep(0.002, 0.0, segment(uv, foot, cam)));
    c = mix(c, vec3(0.9, 0.3, 0.3), smoothstep(0.012, 0.008, d));
  }
  outColor = vec4(c, 1.0);
}
