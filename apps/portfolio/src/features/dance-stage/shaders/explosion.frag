// note: 8 拍ごとに、踊る人の背後で火の玉が膨らんで燃え広がり、部屋を橙色に照らして画面を揺らす。人物は火の手前に残る。
void main() {
  float since = mod(beatCount, 8.0) + beat;
  float shake = exp(-since * 2.0) * 0.012;
  vec2 p = uv + shake * vec2(sin(time * 70.0), cos(time * 53.0));
  vec2 center = vec2(0.42, 0.62);
  float r = 0.5 * (1.0 - exp(-since * 1.4));
  float heat = clamp(1.0 - since / 6.0, 0.0, 1.0);
  float d = dist(p, center) / max(r, 0.001);
  float turb = fbm(p * 6.0 - vec2(0.0, since * 0.6));
  float fire = smoothstep(1.0, 0.4, d + (turb - 0.5) * 0.8) * heat;
  vec3 flame = mix(vec3(0.25, 0.05, 0.0), vec3(1.0, 0.75, 0.25), clamp(fire * 1.5 - d * 0.3, 0.0, 1.0));
  vec3 smoke = vec3(0.15) * smoothstep(1.4, 0.6, d + (turb - 0.5)) * (1.0 - heat) * step(0.0, since - 2.0);
  vec3 bg = plate(p) * (1.0 + vec3(1.0, 0.5, 0.1) * heat * 1.2);
  bg = mix(bg, flame, fire);
  bg = mix(bg, smoke, step(0.001, length(smoke)) * 0.5);
  vec3 body = rgb(p) * (1.0 + vec3(0.8, 0.4, 0.1) * heat * 0.6);
  outColor = vec4(mix(bg, body, matte(p)), 1.0);
}
