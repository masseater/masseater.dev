// note: 1 秒、1.5 秒、2 秒の長さで繰り返す 3 つの短いループを作り、赤、緑、青に色を分けて加算で重ねる。拍ごとにどのループを出すかを切り替える。
void main() {
  float on = mod(beatCount, 7.0) + 1.0;
  float l1 = mod(on, 2.0);
  float l2 = mod(floor(on / 2.0), 2.0);
  float l3 = mod(floor(on / 4.0), 2.0);
  vec3 c = vec3(0.02);
  float anchor = floor(time / 4.0) * 4.0;
  c += vec3(1.0, 0.3, 0.4) * pastMatte(uv, anchor + mod(time, 1.0)) * l1 * 0.8;
  c += vec3(0.3, 1.0, 0.4) * pastMatte(uv + vec2(0.08, 0.0), anchor + 1.0 + mod(time, 1.5)) * l2 * 0.8;
  c += vec3(0.3, 0.5, 1.0) * pastMatte(uv - vec2(0.08, 0.0), anchor + 2.0 + mod(time, 2.0)) * l3 * 0.8;
  c += rgb(uv) * matte(uv) * 0.25;
  outColor = vec4(c, 1.0);
}
