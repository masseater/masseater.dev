// note: 左上の窓から差し込む光が空気中のほこりを照らしたように、光の筋を描く。踊る人が光を遮った所は筋が途切れ、体の影が光の中に伸びる。
void main() {
  vec2 lightPos = vec2(0.05, -0.1);
  vec3 c = rgb(uv) * 0.55;
  float acc = 0.0;
  vec2 dir = (uv - lightPos) / 32.0;
  vec2 p = uv;
  for (int i = 0; i < 32; i++) {
    p -= dir;
    float open = (1.0 - matte(p)) * step(0.0, p.y);
    float window = step(fract(p.x * 4.0 + p.y * 1.0), 0.75);
    acc += open * window * (1.0 - float(i) / 32.0);
  }
  acc /= 32.0;
  float dust = 0.8 + 0.2 * noise(uv * 200.0 + time);
  c += vec3(1.0, 0.92, 0.75) * acc * 1.6 * dust;
  outColor = vec4(c, 1.0);
}
