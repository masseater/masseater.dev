// note: 顔のまわりだけに作り物の皮膚を貼ったように、肌を緑がかった色に変え、しわの凹凸と、頬を斜めに横切る傷の縫い目を描き足す。
void main() {
  vec3 c = rgb(uv);
  vec2 face = joint(0) + vec2(0.0, 0.0);
  float d = dist(uv, face);
  float region = smoothstep(0.085, 0.06, d) * matte(uv);
  float wrinkle = noise(uv * vec2(60.0, 140.0));
  vec3 skin = mix(vec3(0.45, 0.6, 0.35), vec3(0.3, 0.42, 0.25), wrinkle) * (0.6 + 0.7 * luma(c));
  c = mix(c, skin, region * 0.85);
  vec2 q = (uv - face) * vec2(aspect(), 1.0);
  float scar = abs(q.y - q.x * 0.8 - 0.01);
  float stitches = step(0.6, fract((q.x + q.y) * 120.0)) * step(scar, 0.008);
  c = mix(c, vec3(0.45, 0.1, 0.12), smoothstep(0.004, 0.0015, scar) * region);
  c = mix(c, vec3(0.1), stitches * region);
  outColor = vec4(c, 1.0);
}
