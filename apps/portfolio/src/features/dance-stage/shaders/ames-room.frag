// note: 奥の壁が斜めに傾いた部屋を正面から見て、四角い部屋に見せる。左の隅では人が小さく、右の隅では大きく写り、6 秒かけて左右の隅を行き来する。
void main() {
  float phase = 0.5 + 0.5 * sin(time * 2.0 * PI / 6.0);
  float scale = mix(0.55, 1.25, phase);
  vec2 foot = vec2(mix(0.25, 0.72, phase), 0.9);
  vec3 c = mix(vec3(0.9, 0.85, 0.75), vec3(0.75, 0.68, 0.58), uv.y);
  float floorLine = mix(0.75, 0.95, uv.x);
  if (uv.y > floorLine) {
    vec2 tile = vec2(uv.x * 10.0, (uv.y - floorLine) * 30.0 / (1.0 + uv.x));
    c = mix(vec3(0.15), vec3(0.95), step(0.5, fract(floor(tile.x) * 0.5 + floor(tile.y) * 0.5)));
  }
  float window = step(abs(uv.x - 0.3), 0.06) * step(abs(uv.y - 0.4), 0.1) + step(abs(uv.x - 0.75), 0.08) * step(abs(uv.y - 0.4), 0.13);
  c = mix(c, vec3(0.55, 0.75, 0.95), window);
  vec2 p = vec2((uv.x - foot.x) / (0.5 * scale) + 0.56, (uv.y - foot.y) / (0.9 * scale) + 0.95);
  float m = matte(p) * inside(p);
  c = mix(c, rgb(p), m);
  outColor = vec4(c, 1.0);
}
