// note: 電車の窓から見た景色を右から左へ流し、建物や電柱や鉄塔を拍の刻みに合わせた間隔で並べる。踊る人は窓の手前に立ち、窓枠を前に重ねる。
void main() {
  float speed = 0.35;
  float x = uv.x + time * speed;
  float slot = floor(x * 6.0);
  float local = fract(x * 6.0);
  float kind = floor(hash(vec2(slot, 4.0)) * 3.0);
  vec3 sky = mix(vec3(0.75, 0.85, 0.95), vec3(0.95, 0.85, 0.75), uv.y);
  vec3 c = sky;
  float ground = 0.78;
  float h = 0.0;
  if (kind < 0.5) h = 0.25 + 0.2 * hash(vec2(slot, 7.0));
  float building = step(ground - h, uv.y) * step(abs(local - 0.5), 0.32) * step(0.01, h);
  vec3 bcol = mix(vec3(0.45, 0.5, 0.6), vec3(0.6, 0.55, 0.5), hash(vec2(slot, 8.0)));
  vec2 win = fract(vec2(local * 6.0, uv.y * 30.0));
  bcol = mix(bcol, vec3(0.85, 0.9, 0.95), step(0.5, win.x) * step(0.5, win.y) * 0.4);
  c = mix(c, bcol, building);
  float pole = step(abs(local - 0.5), 0.012) * step(ground - 0.4, uv.y) * step(0.5, kind) * step(kind, 1.5);
  c = mix(c, vec3(0.25), pole);
  float tower = step(1.5, kind) * step(abs(local - 0.5) * 2.0, (uv.y - (ground - 0.55)) * 0.35) * step(ground - 0.55, uv.y) * step(0.5, fract(uv.y * 40.0 + local * 10.0));
  c = mix(c, vec3(0.35, 0.35, 0.4), tower);
  float fx = uv.x + time * speed * 2.5;
  c = mix(c, vec3(0.3, 0.45, 0.3) * (0.8 + 0.2 * noise(vec2(fx * 30.0, uv.y * 10.0))), step(ground, uv.y));
  c = mix(c, rgb(uv), matte(uv));
  vec2 frameEdge = abs(uv - 0.5);
  float frame = step(0.44, frameEdge.x) + step(0.42, frameEdge.y);
  c = mix(c, vec3(0.55, 0.55, 0.52), min(frame, 1.0));
  outColor = vec4(c, 1.0);
}
