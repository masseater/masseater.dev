// note: 斜めに置いた鏡に映した城の模型を画面いっぱいに使い、鏡の銀を門の形にだけ削って、その奥で踊る人を通して見せる。模型の巨大な門の中で人が踊っているように見える。
void main() {
  vec3 sky = mix(vec3(0.95, 0.75, 0.55), vec3(0.4, 0.5, 0.75), 1.0 - uv.y);
  vec3 c = sky;
  float wall = step(0.35, uv.y);
  float crenel = step(0.3, uv.y) * step(0.5, fract(uv.x * 14.0));
  float tower = step(abs(uv.x - 0.15), 0.08) * step(0.15, uv.y) + step(abs(uv.x - 0.85), 0.08) * step(0.15, uv.y);
  float towerTop = step(abs(uv.x - 0.15), 0.1) * step(abs(uv.y - 0.13), 0.03) + step(abs(uv.x - 0.85), 0.1) * step(abs(uv.y - 0.13), 0.03);
  float stone = max(max(wall, crenel), max(tower, towerTop));
  vec3 bricks = vec3(0.6, 0.55, 0.48) * (0.8 + 0.2 * step(0.1, fract(uv.y * 30.0)) * step(0.05, fract(uv.x * 20.0 + step(0.5, fract(uv.y * 15.0)) * 0.5)));
  c = mix(c, bricks, min(stone, 1.0));
  vec2 gate = (uv - vec2(0.5, 0.67)) / vec2(0.16, 0.33);
  float arch = step(abs(gate.x), 1.0) * step(gate.y, 1.0) * step(-1.0, gate.y) * step(length(vec2(gate.x, min(gate.y + 0.4, 0.0) / 0.6)), 1.0);
  vec2 p = vec2((uv.x - 0.5) / 0.45 + 0.56, (uv.y - 0.34) / 0.66);
  c = mix(c, rgbOr(p, vec3(0.1)), arch);
  c = mix(c, vec3(0.95), smoothstep(0.02, 0.0, abs(length(vec2(gate.x, min(gate.y + 0.4, 0.0) / 0.6)) - 1.0)) * step(gate.y, 1.0) * 0.3);
  outColor = vec4(c, 1.0);
}
