// note: 顔の位置を追いながら 3.5 倍に寄る。元の解像度が低いので、粗さが目立たないよう少しだけぼかす。
void main() {
  vec2 face = joint(0) + vec2(0.0, 0.01);
  vec2 p = (uv - 0.5) / 3.5 + face;
  vec3 c = mix(rgb(p), blurRgb(p, 0.004), 0.5);
  outColor = vec4(c, 1.0);
}
