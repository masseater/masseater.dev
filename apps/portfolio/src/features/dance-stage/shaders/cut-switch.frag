// note: 前半 4 秒は 2 つの映像を混ぜずに 2 拍ごとに硬く切り替え、後半 4 秒は拍ごとに交互に出すタイムスイッチにする。片方はそのままの踊り、もう片方は 1 秒前の踊りを左右反転して青く染めたもの。
// text: カット
// text: タイムスイッチ
void main() {
  float second = step(4.0, mod(time, 8.0));
  float pick = mix(mod(floor(beatCount / 2.0), 2.0), mod(beatCount, 2.0), second);
  vec3 a = rgb(uv);
  vec3 b = pastRgb(vec2(1.0 - uv.x, uv.y), time - 1.0);
  b = vec3(luma(b)) * vec3(0.4, 0.7, 1.1);
  vec3 c = mix(a, b, pick);
  int row = int(second);
  c = mix(c, vec3(0.0), textBox(uv + vec2(0.002, -0.003), vec2(0.16, 0.08), 0.06, row) * 0.7);
  c = mix(c, vec3(1.0), textBox(uv, vec2(0.16, 0.08), 0.06, row));
  outColor = vec4(c, 1.0);
}
