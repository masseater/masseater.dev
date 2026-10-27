// note: 拍の瞬間の 0.12 秒を何度も繰り返して声を音程のように並べた音MADの切り貼りを映像で見せる。拍ごとに左右を反転し、音の高さの代わりに色相を変える。
void main() {
  float hold = beat - mod(beat, 0.12);
  float flip = mod(beatCount, 2.0);
  vec2 p = vec2(mix(uv.x, 1.0 - uv.x, flip), uv.y);
  float zoom = 1.0 + 0.1 * step(0.5, mod(beatCount, 3.0));
  p = (p - 0.5) / zoom + 0.5;
  vec3 c = pastRgb(p, time - hold);
  float hue = mod(beatCount, 5.0) * 0.08;
  vec3 tint = hsv(vec3(hue, 0.18, 1.0));
  c *= tint;
  outColor = vec4(c, 1.0);
}
