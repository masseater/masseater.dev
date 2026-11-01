// note: バラエティ番組の字幕のように、4 拍ごとに黄色の文字に赤と白の二重の縁を付けた大きな字幕を、弾むように画面に出す。
// text: キレッキレ！
// text: 腕、どこまで上がるの
void main() {
  vec3 c = rgb(uv);
  float since = mod(beatCount, 4.0) + beat;
  int row = int(mod(floor(beatCount / 4.0), 2.0));
  float pop = since < 0.3 ? mix(1.6, 1.0, since / 0.3) : 1.0;
  float show = step(since, 3.0);
  vec2 center = vec2(0.5, 0.8);
  float h = (row == 0 ? 0.16 : 0.1) * pop;
  float white = 0.0;
  float red = 0.0;
  for (int k = 0; k < 8; k++) {
    float a = float(k) / 8.0 * 2.0 * PI;
    vec2 o = vec2(cos(a), sin(a));
    white = max(white, textBox(uv + o * 0.012, center, h, row));
    red = max(red, textBox(uv + o * 0.006, center, h, row));
  }
  c = mix(c, vec3(1.0), white * show);
  c = mix(c, vec3(0.85, 0.05, 0.1), red * show);
  c = mix(c, vec3(1.0, 0.9, 0.1), textBox(uv, center, h, row) * show);
  outColor = vec4(c, 1.0);
}
