// note: 前のフレームの画を薄く残したまま今の画を重ね、腕を振った跡を残像として引く。
// pass: trail persistent
uniform sampler2D trail;
void main() {
  outColor = vec4(mix(read(trail, uv).rgb, rgb(uv), 0.18), 1.0);
}
// pass:
uniform sampler2D trail;
void main() { outColor = vec4(mix(read(trail, uv).rgb, rgb(uv), 0.35), 1.0); }
