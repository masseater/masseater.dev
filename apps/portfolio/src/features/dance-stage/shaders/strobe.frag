// note: 1 秒に 2.5 回だけ光るストロボの下で踊ったように、光った瞬間の画だけを残し、次に光るまで暗く消えていく。光の回数は見る人の負担にならないよう 1 秒に 3 回より少なくした。
// pass: held persistent
uniform sampler2D held;
void main() {
  vec4 last = read(held, uv);
  float want = mod(floor(time * 2.5), 250.0) + 1.0;
  outColor = floor(last.a * 255.0 + 0.5) != want ? vec4(rgb(uv), want / 255.0) : last;
}
// pass:
uniform sampler2D held;
void main() {
  float phase = fract(time * 2.5);
  vec3 c = read(held, uv).rgb * (0.15 + 0.85 * exp(-phase * 4.0));
  outColor = vec4(c, 1.0);
}
