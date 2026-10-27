// note: 拍ごとに動画のまったく別の瞬間へ切り替え、白黒、夕焼け色、人のいない部屋、粗い粒、のどれかの見た目で断片を並べる。下には前後のつながらない字幕を 1 行ずつ出す。
// text: いつからこうなったんだろう
// text: 明日も同じ部屋
// text: それでも踊る
// text: だれも見ていない
void main() {
  float shot = floor(beatCount);
  float offset = hash(vec2(shot, 1.0)) * 28.8;
  float look = floor(hash(vec2(shot, 2.0)) * 4.0);
  vec3 c = pastRgb(uv, offset + beat * 0.5);
  if (look < 0.5) c = vec3(luma(c));
  else if (look < 1.5) c = c * vec3(1.2, 0.75, 0.5);
  else if (look < 2.5) c = plate(uv) * 0.8;
  else c = c + (hash(uv * resolution + time) - 0.5) * 0.3;
  c *= 0.85;
  int line = int(mod(shot, 4.0));
  c = mix(c, vec3(0.0), textBox(uv + vec2(0.002, -0.003), vec2(0.5, 0.88), 0.05, line) * 0.8);
  c = mix(c, vec3(1.0), textBox(uv, vec2(0.5, 0.88), 0.05, line));
  outColor = vec4(c, 1.0);
}
