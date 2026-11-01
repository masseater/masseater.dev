// note: 画面を上から下へ少しずつ書き換える。行ごとに写す時刻がずれるので、速く動く腕が斜めに曲がる。
// pass: shutter persistent
uniform sampler2D shutter;
void main() {
  float line = fract(frame / 12.0);
  float written = step(abs(uv.y - line), 1.0 / 12.0 + 0.002);
  outColor = mix(read(shutter, uv), vec4(rgb(uv), 1.0), written);
}
// pass:
uniform sampler2D shutter;
void main() { outColor = read(shutter, uv); }
