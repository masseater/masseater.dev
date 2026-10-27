// note: 2 秒踊ったら、その瞬間で時間を止め、止まった人の周りをカメラが回り込む。人物は止まったまま向きが変わり、背景は回り込みに合わせて反対へ流れる。
void main() {
  float cycle = floor(time / 4.0);
  float phase = fract(time / 4.0);
  if (phase < 0.5) { outColor = vec4(rgb(uv), 1.0); return; }
  float t = cycle * 4.0 + 2.0;
  float orbit = smoothstep(0.5, 1.0, phase);
  float angle = orbit * PI * 0.9 - PI * 0.45;
  vec3 back = blurPlate(vec2(uv.x + angle * 0.35, uv.y), 0.004);
  float squash = max(abs(cos(angle)), 0.25);
  float axis = 0.56;
  vec2 p = vec2((uv.x - axis) / squash + axis, uv.y);
  float m = pastMatte(p, t) * inside(p);
  vec3 body = pastRgb(p, t) * (0.75 + 0.25 * cos(angle));
  outColor = vec4(mix(back, body, m), 1.0);
}
