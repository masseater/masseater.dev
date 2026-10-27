// note: 一枚の絵から推定した奥行きを、近いほど赤く遠いほど青い色の地図として右上に出し、その奥行きで画を動かして写真が立体的に揺れるように見せる。人は手前、部屋の上の方ほど奥とみなす。
float depthAt(vec2 p) {
  float wall = 0.25 + 0.35 * p.y;
  return max(wall, matte(p) * 0.9 + 0.1);
}
void main() {
  vec2 cam = vec2(sin(time * 0.9), cos(time * 0.7) * 0.5) * 0.02;
  vec2 p = uv;
  for (int i = 0; i < 4; i++) p = uv - cam * (depthAt(p) - 0.5);
  vec3 c = rgb(p);
  vec2 inset = (uv - vec2(0.7, 0.03)) / vec2(0.27, 0.27);
  if (inset.x > 0.0 && inset.x < 1.0 && inset.y > 0.0 && inset.y < 1.0) {
    float d = depthAt(inset);
    c = mix(vec3(0.1, 0.2, 0.8), vec3(0.95, 0.2, 0.1), d);
    c = mix(c, vec3(0.9, 0.9, 0.2), smoothstep(0.4, 0.6, d) * (1.0 - smoothstep(0.6, 0.9, d)));
  }
  outColor = vec4(c, 1.0);
}
