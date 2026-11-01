// note: 踊りをゲームの画面に見立てて得点と体力の棒を出し、右下には本人の顔を切り抜いた小窓と声の波形を、左下には実況の字幕を重ねる。
// text: ここで片足！いけるいける！
void main() {
  vec3 c = rgb(uv);
  c = mix(c, vec3(0.0), step(uv.y, 0.09) * 0.5);
  c = mix(c, vec3(1.0, 0.95, 0.3), number(uv, vec2(0.03, 0.015), 0.06, beatCount * 100.0, 6));
  float hp = step(abs(uv.y - 0.045), 0.012) * step(0.55, uv.x) * step(uv.x, 0.95);
  c = mix(c, vec3(0.3), hp);
  c = mix(c, vec3(0.3, 0.9, 0.3), hp * step(uv.x, 0.55 + 0.4 * (0.5 + 0.5 * cos(time * 0.3))));
  vec2 lo = vec2(0.76, 0.62);
  vec2 hi = vec2(0.97, 0.94);
  if (uv.x > lo.x && uv.x < hi.x && uv.y > lo.y && uv.y < hi.y) {
    vec2 q = (uv - lo) / (hi - lo);
    c = rgb(joint(0) + (q - 0.5) * vec2(0.18, 0.28));
    float wave = abs(q.y - 0.88 - sin(q.x * 40.0 + time * 20.0) * 0.05 * level);
    c = mix(c, vec3(0.3, 1.0, 0.6), smoothstep(0.012, 0.0, wave) * step(0.78, q.y));
  }
  float frame = step(abs(uv.x - (lo.x + hi.x) * 0.5) * aspect(), (hi.x - lo.x) * 0.5 * aspect() + 0.004) * step(abs(uv.y - (lo.y + hi.y) * 0.5), (hi.y - lo.y) * 0.5 + 0.006);
  frame *= 1.0 - step(abs(uv.x - (lo.x + hi.x) * 0.5), (hi.x - lo.x) * 0.5) * step(abs(uv.y - (lo.y + hi.y) * 0.5), (hi.y - lo.y) * 0.5);
  c = mix(c, vec3(1.0), frame);
  c = mix(c, vec3(0.0), textBox(uv + vec2(0.002, -0.003), vec2(0.3, 0.9), 0.05, 0) * 0.8);
  c = mix(c, vec3(1.0), textBox(uv, vec2(0.3, 0.9), 0.05, 0));
  outColor = vec4(c, 1.0);
}
