// note: 曲はそのままに、映像だけを拍ごとの短い断片に切り、それぞれを踊りの中の別の瞬間から持ってきて並べ直す。下の帯は、どの断片をどこから持ってきたかを並べたものである。
void main() {
  float grain = beatCount;
  float source = floor(hash(vec2(grain, 2.0)) * DURATION * 4.0) / 4.0;
  vec2 top = vec2(uv.x, uv.y / 0.8);
  vec3 c = pastRgb(top, source + beat);
  if (uv.y > 0.8) {
    float slot = floor(uv.x * 8.0);
    float g = grain - 3.0 + slot;
    float s = floor(hash(vec2(g, 2.0)) * DURATION * 4.0) / 4.0;
    vec2 local = vec2(fract(uv.x * 8.0), (uv.y - 0.8) / 0.2);
    c = pastRgb(local, s);
    float now = step(abs(slot - 3.0), 0.1);
    float edge = step(local.x, 0.03) + step(0.97, local.x);
    c = mix(c * (0.45 + 0.55 * now), vec3(1.0, 0.8, 0.2), max(edge * now, step(local.y, 0.03)));
  }
  outColor = vec4(c, 1.0);
}
