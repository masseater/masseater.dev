// note: 人物の後ろの部屋をぼかし、奥に小さな明かりを並べて丸い光の玉にする。4 秒ごとに、絞りの形を変えたようにハートの形の玉に切り替える。
void main() {
  vec3 c = blurPlate(uv, 0.02) * 0.7;
  float heart = step(0.5, fract(time / 8.0));
  for (int i = 0; i < 24; i++) {
    float fi = float(i);
    vec2 at = vec2(hash(vec2(fi, 1.0)), 0.1 + 0.6 * hash(vec2(fi, 2.0)));
    float r = 0.035 + 0.03 * hash(vec2(fi, 3.0));
    vec2 q = (uv - at) * vec2(aspect(), 1.0) / r;
    float circle = length(q);
    vec2 h = vec2(q.x, -q.y + 0.25) * 1.1;
    float hs = pow(h.x * h.x + h.y * h.y - 0.6, 3.0) - h.x * h.x * h.y * h.y * h.y;
    float shape = mix(smoothstep(1.0, 0.9, circle), step(hs, 0.0), heart);
    c += hsv(vec3(0.08 + 0.1 * hash(vec2(fi, 4.0)), 0.5, 1.0)) * shape * 0.35;
  }
  c = mix(c, rgb(uv), matte(uv));
  outColor = vec4(c, 1.0);
}
