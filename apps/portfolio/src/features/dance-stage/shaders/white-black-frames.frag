// note: 2 秒に 1 回だけ、1 コマ分だけ白、黒、白黒反転の画を順に挟む。見る人の負担にならないよう、挟む画は 1 秒に 1 回より少なくし、白は灰色寄りにした。
void main() {
  vec3 c = rgb(uv);
  float slot = floor(time / 2.0);
  float inside_ = step(fract(time / 2.0) * 2.0, 1.0 / 24.0);
  float kind = mod(slot, 3.0);
  vec3 insert_ = kind < 0.5 ? vec3(0.8) : kind < 1.5 ? vec3(0.05) : 1.0 - c;
  outColor = vec4(mix(c, insert_, inside_), 1.0);
}
