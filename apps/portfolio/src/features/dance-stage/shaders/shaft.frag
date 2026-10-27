// note: 3 秒ごとに、首を大きくかしげたように画面ごと斜めに傾けたカットと、黒地に文字だけのカットを交互に挟む。
// text: 踊るって
// text: なんだろう
void main() {
  float slot = mod(floor(time / 1.5), 4.0);
  vec3 c;
  if (slot == 1.0 || slot == 3.0) {
    c = vec3(0.04);
    int row = slot == 1.0 ? 0 : 1;
    c = mix(c, vec3(0.95, 0.15, 0.2), textBox(uv, vec2(0.5, 0.5), 0.14, row));
  } else {
    float tilt = slot == 0.0 ? 0.7 : -0.6;
    vec2 head = joint(0);
    vec2 p = rot((uv - head) * vec2(aspect(), 1.0), tilt) / vec2(aspect(), 1.0) / 1.2 + head;
    c = rgbOr(p, vec3(0.9, 0.88, 0.85));
  }
  outColor = vec4(c, 1.0);
}
