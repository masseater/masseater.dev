// note: 広場に何十人もの踊り手を置いた 1 枚の絵にする。全員が同じ踊りの別の瞬間を踊り、服の色もそれぞれ違う。奥の列ほど小さく描く。
void main() {
  vec3 c = mix(vec3(0.55, 0.75, 0.45), vec3(0.75, 0.68, 0.5), uv.y);
  for (int r = 0; r < 6; r++) {
    float depth = float(r);
    float size = 0.14 + depth * 0.035;
    float y0 = 0.05 + depth * 0.14 - size * 0.2;
    float count = floor(1.0 / (size * 0.5));
    float shift = hash(vec2(depth, 4.0));
    float slot = floor(uv.x / (size * 0.5) + shift);
    vec2 cell = vec2(slot, depth);
    vec2 local = vec2((uv.x / (size * 0.5) + shift - slot) * 0.5 + 0.3, (uv.y - y0) / size);
    if (local.y < 0.0 || local.y > 1.0) continue;
    float t = hash(cell) * DURATION;
    float m = pastMatte(local, t + time);
    vec3 dancer = pastRgb(local, t + time);
    vec3 tint = hsv(vec3(hash(cell + 2.0), 0.7, 1.0));
    dancer = mix(dancer, dancer * tint * 1.6, step(0.35, local.y) * step(local.y, 0.65));
    c = mix(c, dancer, m);
  }
  outColor = vec4(c, 1.0);
}
