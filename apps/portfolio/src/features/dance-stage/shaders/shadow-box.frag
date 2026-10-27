// note: 明るさで 4 枚の層に切り分けた切り絵を、隙間を空けて重ね、後ろから暖かい光で照らす。視点がゆっくり揺れると層どうしがずれて奥行きが見える。
void main() {
  vec2 sway = vec2(sin(time * 0.7), cos(time * 0.5)) * 0.01;
  vec3 c = vec3(1.0, 0.85, 0.6);
  vec3 tones[4] = vec3[4](vec3(0.85, 0.75, 0.6), vec3(0.6, 0.45, 0.35), vec3(0.35, 0.25, 0.25), vec3(0.12, 0.1, 0.12));
  for (int i = 0; i < 4; i++) {
    float layer = float(i);
    vec2 p = uv + sway * (layer + 1.0);
    float cut = step(luma(blurRgb(p, 0.003)), 0.85 - layer * 0.18);
    float shadow = step(luma(blurRgb(p + vec2(0.006, 0.01), 0.003)), 0.85 - layer * 0.18);
    c = mix(c, c * 0.7, shadow * (1.0 - cut));
    c = mix(c, tones[i], cut);
  }
  float frame_ = step(0.03, uv.x) * step(uv.x, 0.97) * step(0.05, uv.y) * step(uv.y, 0.95);
  c = mix(vec3(0.2, 0.15, 0.1), c, frame_);
  outColor = vec4(c, 1.0);
}
