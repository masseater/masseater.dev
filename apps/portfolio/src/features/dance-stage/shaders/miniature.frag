// note: 机の上の箱庭の町に、踊る人を小さく立たせる。家の屋根や木を模型らしい鮮やかな色にし、手前と奥をぼかして小さく見せる。
void main() {
  vec3 c = vec3(0.45, 0.6, 0.35);
  vec2 q = uv * vec2(aspect(), 1.0) * 5.0;
  vec2 cell = floor(q);
  vec2 f = fract(q);
  float road = step(f.x, 0.18) + step(f.y, 0.2);
  c = mix(c, vec3(0.45), min(road, 1.0));
  vec2 house = (f - vec2(0.6, 0.6)) / 0.28;
  float h = step(max(abs(house.x), abs(house.y)), 1.0) * step(0.35, hash(cell));
  vec3 roof = hsv(vec3(hash(cell + 2.0), 0.75, 0.95));
  c = mix(c, roof * (0.8 + 0.2 * step(0.0, house.x)), h);
  float tree = step(length(f - vec2(0.35, 0.75)), 0.08) * step(0.5, hash(cell + 5.0));
  c = mix(c, vec3(0.15, 0.5, 0.2), tree);
  vec2 p = (uv - vec2(0.52, 0.42)) / 0.45 + vec2(0.56, 0.5);
  float m = matte(p) * inside(p);
  c = mix(c, c * 0.6, matte(p + vec2(-0.05, -0.04)) * inside(p + vec2(-0.05, -0.04)) * (1.0 - m));
  c = mix(c, rgb(p) * 1.1, m);
  float blur = smoothstep(0.15, 0.45, abs(uv.y - 0.5));
  c = mix(c, c * 0.9 + 0.05, blur * 0.5);
  outColor = vec4(c, 1.0);
}
