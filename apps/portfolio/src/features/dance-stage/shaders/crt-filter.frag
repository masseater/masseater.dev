// note: 画面をブラウン管のように丸くふくらませ、赤緑青の縦の蛍光体の並びと横の走査線を重ねて、明るい所を少しにじませる。四隅は暗く落とす。
void main() {
  vec2 p = uv - 0.5;
  p *= 1.0 + dot(p, p) * 0.25;
  p += 0.5;
  vec3 c = rgb(p) * 0.85 + blurRgb(p, 0.006) * 0.3;
  float scan = 0.75 + 0.25 * sin(p.y * resolution.y * 1.4);
  float sub = mod(floor(uv.x * resolution.x / 1.5), 3.0);
  vec3 mask = vec3(sub == 0.0 ? 1.0 : 0.7, sub == 1.0 ? 1.0 : 0.7, sub == 2.0 ? 1.0 : 0.7);
  c *= scan * mask * 1.15;
  c *= inside(p);
  c *= smoothstep(0.75, 0.4, length(uv - 0.5));
  outColor = vec4(c, 1.0);
}
