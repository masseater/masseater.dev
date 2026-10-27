// note: レンズを外して手で前に構えたように、ピントの合う場所が画面の中を漂い、隙間から入った光が橙色ににじむ。
void main() {
  vec2 focus = vec2(0.5 + 0.3 * sin(time * 0.7), 0.5 + 0.2 * cos(time * 0.5));
  float r = smoothstep(0.05, 0.5, dist(uv, focus)) * 0.04;
  vec3 c = blurRgb(uv, r);
  vec2 leak = vec2(0.5 + 0.6 * sin(time * 0.37), 0.5 + 0.5 * cos(time * 0.29));
  c += vec3(1.0, 0.45, 0.15) * 0.6 * exp(-dist(uv, leak) * 3.0) * (0.6 + 0.4 * sin(time * 1.3));
  outColor = vec4(c, 1.0);
}
