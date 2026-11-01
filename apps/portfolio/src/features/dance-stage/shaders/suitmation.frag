// note: 着ぐるみの怪獣のように、踊る人を巨大にしてミニチュアのビル街に立たせる。手前のビルが足元を隠し、足元から土煙が上がる。
void main() {
  vec3 sky = mix(vec3(0.85, 0.6, 0.45), vec3(0.35, 0.4, 0.6), 1.0 - uv.y);
  vec2 p = (uv - vec2(0.5, 0.3)) / 1.15 + vec2(0.56, 0.42);
  vec3 c = mix(sky, rgb(p), matte(p) * inside(p));
  float x = floor(uv.x * 14.0);
  float h = 0.62 + 0.18 * hash(vec2(x, 1.0));
  float back = step(h, uv.y);
  vec2 w = fract(vec2(uv.x * 14.0 * 3.0, uv.y * 30.0));
  vec3 building = vec3(0.35, 0.35, 0.4) * (0.7 + 0.3 * hash(vec2(x, 2.0)));
  building = mix(building, vec3(0.9, 0.85, 0.5), step(0.4, w.x) * step(w.x, 0.7) * step(0.3, w.y) * step(w.y, 0.7) * step(0.5, hash(floor(uv * vec2(42.0, 30.0)))) * 0.6);
  c = mix(c, building, back);
  float dust = fbm(vec2(uv.x * 5.0, uv.y * 3.0 - time * 0.3)) * smoothstep(0.55, 0.85, uv.y) * smoothstep(0.35, 0.0, abs(uv.x - 0.5));
  c = mix(c, vec3(0.7, 0.62, 0.5), dust * 0.6);
  outColor = vec4(c, 1.0);
}
