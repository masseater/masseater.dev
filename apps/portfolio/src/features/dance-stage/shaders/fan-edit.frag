// note: 映画のような横長の黒帯、拍に合わせたゆっくりと速いの切り替え、橙と青の色味、光のにじみをまとめてかけ、ファンが作る編集動画の質感にする。
// text: SEIKIN
void main() {
  float slow = mod(floor(beatCount / 4.0), 2.0);
  float t = slow > 0.5 ? floor(time / 1.6) * 1.6 + mod(time, 1.6) * 0.4 : time;
  vec3 c = pastRgb(uv, t);
  if (slow < 0.5) c = rgb(uv);
  float l = luma(c);
  c = mix(vec3(0.1, 0.25, 0.35), vec3(1.0, 0.7, 0.45), smoothstep(0.1, 0.9, l)) * 0.5 + c * 0.6;
  c += vec3(1.0, 0.8, 0.6) * smoothstep(0.75, 1.0, l) * 0.3;
  float title = textBox(uv, vec2(0.5, 0.5), 0.2, 0) * smoothstep(0.0, 0.2, fract(time / 9.6)) * (1.0 - smoothstep(0.2, 0.3, fract(time / 9.6)));
  c = mix(c, vec3(1.0), title * 0.9);
  float bar = step(abs(uv.y - 0.5), 0.39);
  outColor = vec4(c * bar, 1.0);
}
