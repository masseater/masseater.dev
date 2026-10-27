// note: 2 秒ごとに、最初の 0.8 秒は同じ 0.2 秒を 4 回繰り返し、そのあと先へ進める。同じ振りが引っかかったように繰り返される。
void main() {
  float base = floor(time / 2.0) * 2.0;
  float local = time - base;
  float t = local < 0.8 ? base + mod(local, 0.2) : base + local - 0.6;
  outColor = vec4(pastRgb(uv, t), 1.0);
}
