// note: 動画を見る人の顔を右下に大きく重ねる、リアクション動画の画面にする。見ている側の顔は同じ人の今の顔を左右反転したアップで、拍のたびに驚いたように寄る。
void main() {
  vec3 c = vec3(0.08);
  vec2 main_ = (uv - vec2(0.03, 0.05)) / vec2(0.7, 0.7);
  c = mix(c, rgb(main_), inside(main_));
  vec2 box = (uv - vec2(0.6, 0.48)) / vec2(0.38, 0.48);
  if (inside(box) > 0.5) {
    float zoom = 1.0 + 0.15 * exp(-beat * 5.0);
    vec2 p = joint(0) + (box - 0.5) * vec2(0.25, 0.32) / zoom + vec2(0.0, 0.03);
    c = rgb(vec2(1.0 - p.x + 2.0 * joint(0).x - 1.0, p.y)) * vec3(1.05, 1.0, 0.95);
    float border = step(box.x, 0.012) + step(0.988, box.x) + step(box.y, 0.015) + step(0.985, box.y);
    c = mix(c, vec3(0.95, 0.2, 0.2), min(border, 1.0));
  }
  outColor = vec4(c, 1.0);
}
