// note: 4 秒ごとに選んだ 1 枚の画で止め、口だけを拍に合わせて開け閉めし、ときどき目を閉じる。一枚絵のまま話しているように見せる。
void main() {
  float t = floor(time / 4.0) * 4.0;
  vec3 c = pastRgb(uv, t);
  vec2 face = joint(0);
  vec2 mouth = face + vec2(0.0, 0.035);
  vec2 q = (uv - mouth) * vec2(aspect(), 1.0);
  float open = 0.004 + 0.012 * (0.5 + 0.5 * sin(beat * PI * 2.0));
  float lips = step(length(q / vec2(0.016, open)), 1.0);
  c = mix(c, vec3(0.35, 0.08, 0.1), lips);
  float blink = step(0.92, fract(time / 2.3));
  vec2 eyes = abs((uv - (face + vec2(0.0, -0.005))) * vec2(aspect(), 1.0));
  float lid = step(abs(eyes.x - 0.018), 0.01) * step(eyes.y, 0.006) * blink;
  c = mix(c, c * 0.6, lid);
  outColor = vec4(c, 1.0);
}
