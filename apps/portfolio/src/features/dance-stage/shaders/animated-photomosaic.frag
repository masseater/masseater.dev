// note: フォトモザイクのマスの中身を止めずに、選んだ瞬間からそのまま再生させる。マスの割り当ては 1 秒ごとにしか選び直さないので、隣のコマで素材がちらちら入れ替わらない。
vec3 frameColor(float index) {
  vec3 s = vec3(0.0);
  for (int i = 0; i < 3; i++) for (int j = 0; j < 3; j++) s += historyTile(vec2(0.2 + 0.3 * float(i), 0.2 + 0.3 * float(j)), index, 0.0).rgb;
  return s / 9.0;
}
float pick(vec2 cell, vec3 target, float shift) {
  float best = 0.0;
  float score = 9.0;
  for (int k = 0; k < 10; k++) {
    float index = floor(hash(cell + float(k) * 7.31) * HISTORY_FRAMES);
    vec3 d = frameColor(index) - target;
    float e = dot(d, d);
    if (e < score) { score = e; best = index; }
  }
  return best + shift;
}
void main() {
  vec2 grid = vec2(40.0, 22.5);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  float second = floor(time);
  vec3 target = pastRgb((cell + 0.5) / grid, second);
  float index = pick(cell, target, (time - second) * HISTORY_FPS);
  vec3 c = historyTile(local, index, 0.0).rgb;
  c = clamp(c * rgb((cell + 0.5) / grid) / max(frameColor(index), vec3(0.05)), 0.0, 1.0);
  outColor = vec4(c, 1.0);
}
