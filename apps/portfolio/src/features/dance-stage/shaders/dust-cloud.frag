// note: 拍のたびに、床に近い方の足首から小さな砂煙を左右に広げ、0.6 秒で薄れて消えさせる。
void main() {
  vec3 c = rgb(uv);
  vec2 foot = joint(27).y > joint(28).y ? joint(27) : joint(28);
  float t = beat;
  float puff = 0.0;
  for (int i = 0; i < 6; i++) {
    float side = i < 3 ? -1.0 : 1.0;
    float fi = float(i);
    vec2 center = foot + vec2(side * (0.02 + t * (0.1 + 0.05 * mod(fi, 3.0))) / aspect() * 1.4, -t * 0.04 * (1.0 + mod(fi, 3.0)));
    float r = 0.015 + t * 0.06;
    puff += smoothstep(r, r * 0.3, dist(uv, center)) * (0.6 + 0.4 * noise(uv * 60.0 + fi));
  }
  puff *= exp(-t * 4.0);
  c = mix(c, vec3(0.8, 0.72, 0.6), clamp(puff, 0.0, 1.0) * 0.8);
  outColor = vec4(c, 1.0);
}
