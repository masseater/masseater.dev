// note: 踊りを古いニュース映画の素材のように扱う。4:3 の枠、退色したセピア、傷と揺れを付け、5 秒ごとに字幕の台紙を挟んで、別の出来事の記録のように見せる。
// text: 昭和の記録映像より
// text: 新しい健康体操、街に広まる
void main() {
  float phase = mod(time, 10.0);
  vec3 c = vec3(0.0);
  vec2 p = vec2((uv.x - 0.5) * aspect() / (4.0 / 3.0) + 0.5, uv.y);
  p.y += (hash(vec2(floor(time * 18.0), 1.0)) - 0.5) * 0.004;
  if (inside(p) > 0.5) {
    float l = luma(rgb(p));
    c = vec3(l * 1.05, l * 0.9, l * 0.7) * (0.85 + 0.15 * hash(vec2(floor(time * 18.0), 3.0)));
    c *= 1.0 - 0.5 * pow(length(p - 0.5) * 1.3, 2.0);
    float scratch = step(0.997, hash(vec2(floor(p.x * 300.0), floor(time * 18.0))));
    c = mix(c, vec3(0.9), scratch);
  }
  if (mod(phase, 5.0) < 1.2) {
    c = vec3(0.06);
    int row = int(floor(phase / 5.0));
    c = mix(c, vec3(0.9, 0.86, 0.75), textBox(uv, vec2(0.5, 0.5), 0.09, row));
  }
  outColor = vec4(c, 1.0);
}
