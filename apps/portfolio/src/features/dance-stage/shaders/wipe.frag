// note: 斜めの境目が画面を横切り、境目の向こうから左右を反転して色を変えた次のカットが現れる。境目には細い光の線を引く。
void main() {
  float phase = fract(time / 2.5);
  float n = floor(time / 2.5);
  float edge = smoothstep(0.2, 0.9, phase) * 1.6 - 0.3;
  float d = uv.x + (uv.y - 0.5) * 0.4 - edge;
  vec3 a = mod(n, 2.0) < 0.5 ? rgb(uv) : rgb(vec2(1.0 - uv.x, uv.y)).brg;
  vec3 b = mod(n, 2.0) < 0.5 ? rgb(vec2(1.0 - uv.x, uv.y)).brg : rgb(uv);
  vec3 c = d < 0.0 ? b : a;
  c += vec3(1.0, 0.9, 0.6) * exp(-abs(d) * 200.0);
  outColor = vec4(c, 1.0);
}
