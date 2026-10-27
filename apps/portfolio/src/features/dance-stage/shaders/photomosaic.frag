// note: 画面を 32×18 のマスに分け、各マスの平均色にいちばん近い瞬間を、踊りの過去の 432 コマから 10 候補のうちで選んで貼り、マスの平均色が元の色に合うよう明るさと色味を整える。離れて見ると今の踊りに、寄って見るとマスの一つ一つが別の瞬間の踊りになっている。
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
  vec2 grid = vec2(32.0, 18.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  vec3 target = rgb((cell + 0.5) / grid);
  float index = pick(cell, target, 0.0);
  vec3 c = historyTile(local, index, 0.0).rgb;
  c = clamp(c * target / max(frameColor(index), vec3(0.05)), 0.0, 1.0);
  outColor = vec4(c, 1.0);
}
