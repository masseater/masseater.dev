// note: 色の各成分を 4 段階に丸め、なめらかな階調を平たい色の面に変える。
void main() {
  float levels = 3.0 + floor(mod(time, 4.0));
  outColor = vec4(floor(rgb(uv) * levels + 0.5) / levels, 1.0);
}
