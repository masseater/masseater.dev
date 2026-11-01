// note: 細いかまぼこ形のレンズを縦に並べた板越しに見る。見る角度が左右に振れるのに合わせて、レンズの一本ずつが今の踊りと 3 秒前の踊りのどちらかを映し、絵が切り替わる。
void main() {
  float lens = 120.0;
  float local = fract(uv.x * lens);
  float view = 0.5 + 0.5 * sin(time * 1.2);
  float pick = step(0.5, fract(local * 0.3 + view));
  vec3 a = rgb(uv);
  vec3 b = pastRgb(uv, time - 3.0);
  b = vec3(b.b, b.r, b.g);
  vec3 c = mix(a, b, pick);
  float ridge = 0.85 + 0.25 * pow(sin(local * PI), 4.0);
  outColor = vec4(c * ridge, 1.0);
}
