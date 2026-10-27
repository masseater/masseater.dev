// note: 3D のキャラをアニメ調で描いたように、人物を明暗 2 段に塗って輪郭線を付け、色の付いた照明の舞台と、床に映る踊りの映り込みを足す。
void main() {
  vec3 stage = mix(vec3(0.05, 0.03, 0.12), vec3(0.2, 0.05, 0.3), uv.y);
  for (int i = 0; i < 3; i++) {
    float x = 0.2 + float(i) * 0.3 + 0.1 * sin(time * 0.7 + float(i));
    float beam = smoothstep(0.08, 0.0, abs(uv.x - x - (uv.y - 0.0) * 0.1 * (float(i) - 1.0))) * (1.0 - uv.y * 0.6);
    stage += hsv(vec3(0.6 + float(i) * 0.15, 0.7, 1.0)) * beam * 0.35;
  }
  float floorY = 0.9;
  vec2 grid = fract(vec2(uv.x * 12.0, (uv.y - floorY) * 60.0));
  float floorLine = step(floorY, uv.y) * (step(grid.x, 0.04) + step(grid.y, 0.1));
  stage += vec3(0.4, 0.3, 0.8) * floorLine * 0.4;
  vec2 mirror = vec2(uv.x, floorY - (uv.y - floorY) * 1.0);
  float mm = matte(mirror) * step(floorY, uv.y);
  stage = mix(stage, rgb(mirror) * 0.35, mm * 0.6);
  vec3 c = rgb(uv);
  float l = luma(c);
  vec3 toon = c / max(l, 0.1) * mix(0.35, 0.8, step(0.45, l));
  float e = 0.004;
  float edge = abs(matte(uv + vec2(e, 0.0)) - matte(uv - vec2(e, 0.0))) + abs(matte(uv + vec2(0.0, e * 1.7)) - matte(uv - vec2(0.0, e * 1.7)));
  vec3 outc = mix(stage, toon, matte(uv));
  outc = mix(outc, vec3(0.05), clamp(edge * 2.0, 0.0, 1.0));
  outColor = vec4(outc, 1.0);
}
