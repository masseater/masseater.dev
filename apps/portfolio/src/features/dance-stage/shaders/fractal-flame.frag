// note: 画面の各点に、絶対値を取って逆数を掛ける写像を 12 回繰り返し、その軌跡の明るさを足して炎のような光の模様を作る。写像の定数をゆっくり動かして模様を変え、踊る人の色で染める。
void main() {
  vec2 p = (uv - 0.5) * vec2(aspect(), 1.0) * 1.5;
  vec2 k = vec2(0.85 + 0.1 * sin(time * 0.2), 0.75 + 0.1 * cos(time * 0.17));
  float acc = 0.0;
  float last = 0.0;
  for (int i = 0; i < 12; i++) {
    p = abs(p) / dot(p, p) - k;
    float l = length(p);
    acc += exp(-abs(l - last) * 4.0);
    last = l;
  }
  vec3 tint = mix(vec3(1.0, 0.5, 0.15), rgb(uv) * 1.5, 0.5);
  vec3 c = tint * acc * 0.12;
  c = mix(c, rgb(uv), matte(uv) * 0.5);
  outColor = vec4(c, 1.0);
}
