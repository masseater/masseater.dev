// note: 下の欄に文章を 1 字ずつ打ち込み、打ち終わると砂嵐のような雑音から少しずつ絵が浮かぶように踊りの映像を生成していく。進み具合の棒が右端に届くと、絵がはっきりする。
// text: 白い部屋で踊る男性、35mm、自然光
void main() {
  float phase = mod(time, 8.0);
  float typed = clamp(phase / 2.0, 0.0, 1.0);
  float gen = clamp((phase - 2.0) / 3.5, 0.0, 1.0);
  float blur = (1.0 - gen) * 0.03;
  vec3 img = blurRgb(uv, blur);
  vec3 noiseC = vec3(hash(floor(uv * resolution / 3.0) + floor(time * 20.0)));
  vec3 c = mix(noiseC, img, smoothstep(0.0, 1.0, gen));
  c *= mix(0.15, 1.0, step(2.0, phase));
  if (uv.y > 0.86) {
    c = vec3(0.1, 0.1, 0.12);
    float box = step(0.88, uv.y) * step(uv.y, 0.96) * step(0.05, uv.x) * step(uv.x, 0.95);
    c = mix(c, vec3(0.2, 0.2, 0.24), box);
    vec2 q = (uv - vec2(0.07, 0.885)) / vec2(0.06 * textAspect(0) / aspect(), 0.06);
    float shown = step(q.x, typed);
    c = mix(c, vec3(0.95), text(q, 0) * shown);
  }
  float bar = step(abs(uv.y - 0.84), 0.004);
  c = mix(c, vec3(0.3), bar);
  c = mix(c, vec3(0.4, 0.7, 1.0), bar * step(uv.x, gen));
  outColor = vec4(c, 1.0);
}
