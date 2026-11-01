// note: 前のコマの出力を少し縮めて回してから入力に戻し、その上に今の踊る人を重ねる。これを毎コマ繰り返すので、人の残像が渦を巻いて奥へ続いていく。
// pass: loop persistent
uniform sampler2D loop;
void main() {
  vec2 q = rot((uv - 0.5) * vec2(aspect(), 1.0), 0.02) / vec2(aspect(), 1.0) * 1.04 + 0.5;
  vec3 last = read(loop, q).rgb * 0.97;
  last = mix(last, last.gbr, 0.04);
  vec3 c = mix(last, rgb(uv), matte(uv));
  outColor = vec4(c, 1.0);
}
// pass:
uniform sampler2D loop;
void main() {
  outColor = vec4(read(loop, uv).rgb, 1.0);
}
