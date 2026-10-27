// note: すべてのかなをちょうど 1 回ずつ使ういろは歌を並べ、拍のたびに次の 1 字を光らせていく。同じ字が 2 度光ることはない。
// glyphs: いろはにほへとちりぬるを
// glyphs: わかよたれそつねならむ
// glyphs: うゐのおくやまけふこえて
// glyphs: あさきゆめみしゑひもせす
void main() {
  vec3 c = rgb(uv) * 0.35;
  float lit = mod(beatCount, 47.0);
  float counts[4] = float[4](12.0, 11.0, 12.0, 12.0);
  float before = 0.0;
  for (int row = 0; row < 4; row++) {
    vec2 center = vec2(0.5, 0.2 + float(row) * 0.2);
    float h = 0.1;
    float t = textBox(uv, center, h, row);
    float width = h * textAspect(row) / aspect();
    float index = floor((uv.x - (center.x - width * 0.5)) / width * counts[row]);
    float on = step(abs(before + index - lit), 0.1);
    float used = step(before + index, lit - 0.5);
    c = mix(c, mix(mix(vec3(0.7), vec3(0.4), used), vec3(1.0, 0.85, 0.2), on), t);
    before += counts[row];
  }
  outColor = vec4(c, 1.0);
}
