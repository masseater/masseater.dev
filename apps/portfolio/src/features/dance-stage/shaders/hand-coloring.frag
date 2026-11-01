// note: 白黒にした画の上に、筆で色を塗ったように、少しはみ出してにじんだ淡い色をのせる。色は大まかな範囲にしか塗らないので、輪郭とずれる。
void main() {
  vec3 src = rgb(uv);
  float l = luma(src);
  vec2 off = (vec2(noise(uv * 8.0), noise(uv * 8.0 + 5.0)) - 0.5) * 0.02;
  vec3 wash = blurRgb(uv + off, 0.02);
  vec3 tint = wash - vec3(luma(wash));
  vec3 c = vec3(l) * vec3(1.0, 0.97, 0.9) + tint * 1.6;
  c = mix(c, c * vec3(1.0, 0.97, 0.9), 0.5);
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
