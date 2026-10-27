// note: 絵の具を厚く塗った油絵のように、周りの 4 方向のうち色のむらがいちばん少ない側の平均色で塗り、細部を筆の塊にまとめる。
void main() {
  vec2 px = 1.0 / resolution;
  vec3 mean[4];
  float var_[4];
  for (int k = 0; k < 4; k++) {
    vec2 dir = vec2(k == 1 || k == 3 ? 1.0 : -1.0, k >= 2 ? 1.0 : -1.0);
    vec3 s = vec3(0.0);
    vec3 s2 = vec3(0.0);
    for (int i = 0; i < 5; i++) for (int j = 0; j < 5; j++) {
      vec3 v = rgb(uv + vec2(float(i), float(j)) * dir * px * 3.0);
      s += v;
      s2 += v * v;
    }
    mean[k] = s / 25.0;
    vec3 var3 = s2 / 25.0 - mean[k] * mean[k];
    var_[k] = var3.r + var3.g + var3.b;
  }
  vec3 c = mean[0];
  float best = var_[0];
  for (int k = 1; k < 4; k++) if (var_[k] < best) { best = var_[k]; c = mean[k]; }
  float canvas = 0.95 + 0.05 * noise(uv * resolution * 0.4);
  outColor = vec4(c * canvas, 1.0);
}
