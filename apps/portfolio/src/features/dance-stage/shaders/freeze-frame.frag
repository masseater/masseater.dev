// note: 3 秒ごとに最後の 1 秒だけ画を止め、止まった瞬間に白く光らせて色を抜く。止めた画は同じパスに保存しておき、動き出すまで出し続ける。
// pass: held persistent
uniform sampler2D held;
void main() {
  float phase = fract(time / 3.0);
  vec4 last = read(held, uv);
  float want = mod(floor(time / 3.0), 250.0) + 1.0;
  bool fresh = phase < 0.66 || floor(last.a * 255.0 + 0.5) != want;
  outColor = fresh ? vec4(rgb(uv), phase < 0.66 ? 0.0 : want / 255.0) : last;
}
// pass:
uniform sampler2D held;
void main() {
  float phase = fract(time / 3.0);
  vec3 c = read(held, uv).rgb;
  if (phase >= 0.66) {
    float k = phase - 0.66;
    c = mix(c, vec3(luma(c)) * vec3(1.05, 1.0, 0.92), 0.8);
    c += vec3(1.0) * exp(-k * 30.0) * 0.6;
    c *= 1.0 - 0.35 * smoothstep(0.3, 0.75, dist(uv, vec2(0.5)));
  }
  outColor = vec4(c, 1.0);
}
