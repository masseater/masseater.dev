// note: 中心から離れるほど強く縮めて、魚眼レンズのように画面を丸く歪める。外側は暗く落とす。
void main() {
  vec2 q = (uv - 0.5) * vec2(aspect(), 1.0);
  float r = length(q);
  float k = 0.9;
  vec2 p = q * (1.0 + k * r * r) / (1.0 + k * 0.25);
  p = p / vec2(aspect(), 1.0) + 0.5;
  vec3 c = rgbOr(p, vec3(0.0));
  c *= 1.0 - smoothstep(0.55, 0.85, r);
  outColor = vec4(c, 1.0);
}
