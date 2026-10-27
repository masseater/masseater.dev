// note: 見ている人の書き込みが、画面の右から左へ流れていくように文字を重ねる。書き込みは 8 つで、高さと速さがそれぞれ違い、黒い縁取りで映像の上でも読める。
// text: うおおおお
// text: キレッキレ
// text: 腕の角度すごい
// text: www
// text: ここ好き
// text: 888888
// text: 中毒性ある
// text: もう一回
void main() {
  vec3 c = rgb(uv);
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float y = 0.06 + fi * 0.11 + 0.02 * hash(vec2(fi, 9.0));
    float speed = 0.12 + 0.08 * hash(vec2(fi, 1.0));
    float h = 0.075;
    float width = h * textAspect(i) / aspect();
    float x = 1.0 + width * 0.5 - fract(time * speed + hash(vec2(fi, 2.0))) * (1.0 + width * 2.0);
    vec2 center = vec2(x, y);
    float outline = 0.0;
    for (int k = 0; k < 4; k++) {
      vec2 o = vec2(k < 2 ? -1.0 : 1.0, mod(float(k), 2.0) * 2.0 - 1.0) * 0.002;
      outline = max(outline, textBox(uv + o, center, h, i));
    }
    c = mix(c, vec3(0.0), outline * 0.9);
    c = mix(c, vec3(1.0), textBox(uv, center, h, i));
  }
  outColor = vec4(c, 1.0);
}
