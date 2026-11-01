// note: 舞台から見た暗い客席に、観客の腕のライトを奥ほど小さく並べ、全部を 1 枚の画面の画素として踊る人の姿を光で浮かべる。拍のたびに色が手前から奥へ波のように変わる。
void main() {
  vec3 c = vec3(0.01, 0.01, 0.03);
  float horizon = 0.3;
  if (uv.y > horizon) {
    float depth = (uv.y - horizon) / (1.0 - horizon);
    float row = floor(pow(depth, 0.6) * 40.0);
    float rowY = horizon + pow((row + 0.5) / 40.0, 1.0 / 0.6) * (1.0 - horizon);
    float spacing = mix(0.006, 0.03, (rowY - horizon) / (1.0 - horizon));
    float col = floor(uv.x / spacing);
    vec2 pos = vec2((col + 0.5) * spacing + (hash(vec2(col, row)) - 0.5) * spacing * 0.4, rowY + sin(time * 3.0 + col) * 0.002);
    float d = length((uv - pos) * vec2(aspect(), 1.0));
    vec2 screenUV = vec2(pos.x, (row + 0.5) / 40.0);
    float m = matte(screenUV);
    float wave = step(fract(row / 40.0 - beat * 1.5), 0.15);
    vec3 band = hsv(vec3(fract(beatCount * 0.17), 0.8, 1.0));
    vec3 light = mix(band * 0.25, vec3(1.0, 0.95, 0.9), m) + band * wave * 0.4;
    c += light * smoothstep(spacing * aspect() * 0.35, 0.0, d);
  }
  c += vec3(0.25, 0.2, 0.4) * smoothstep(0.35, 0.2, abs(uv.y - 0.25)) * 0.2;
  outColor = vec4(c, 1.0);
}
