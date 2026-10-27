// note: 人をコマ撮りしたように、1 秒 6 コマに間引き、コマごとに明るさを少しずつ揺らす。人は床の上を歩かずに、コマごとに少しずつ置き直されて滑るように動く。
void main() {
  float shot = floor(time * 6.0);
  float t = shot / 6.0;
  float slide = sin(shot * 0.12) * 0.25;
  vec2 p = vec2(uv.x - slide, uv.y);
  vec3 bg = plate(uv);
  vec3 c = mix(bg, pastRgb(p, t), pastMatte(p, t) * inside(p));
  c *= 0.95 + 0.08 * hash(vec2(shot, 1.0));
  outColor = vec4(c, 1.0);
}
