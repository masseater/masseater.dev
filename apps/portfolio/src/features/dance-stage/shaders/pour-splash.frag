// note: 床を水面に見立て、拍のたびに踊る人の足元から王冠の形の飛沫を上げ、粒をはね上げて落とす。粒は撮影速度を上げたようにゆっくり動く。
void main() {
  vec3 c = rgb(uv);
  float surface = 0.9;
  if (uv.y > surface) c = mix(c * vec3(0.5, 0.7, 0.9), vec3(0.6, 0.85, 1.0), 0.4 + 0.1 * sin(uv.x * 80.0 + time * 2.0));
  float t = beat * 0.5;
  vec2 foot = vec2((joint(27).x + joint(28).x) * 0.5, surface);
  for (int i = 0; i < 18; i++) {
    float fi = float(i);
    float a = (fi / 17.0 - 0.5) * 2.4;
    float speed = 0.5 + 0.3 * hash(vec2(fi, floor(beatCount)));
    vec2 v = vec2(sin(a) / aspect() * 0.6, -cos(a)) * speed;
    vec2 p = foot + v * t + vec2(0.0, 1.5) * t * t;
    if (p.y < surface) {
      float r = 0.006 + 0.006 * hash(vec2(fi, 3.0));
      float d = dist(uv, p);
      vec3 drop = vec3(0.7, 0.9, 1.0) * (0.7 + 0.5 * smoothstep(r, 0.0, dist(uv, p - vec2(0.002, 0.003))));
      c = mix(c, drop, smoothstep(r, r * 0.6, d));
    }
  }
  float crown = 0.08 * sin(min(t * 6.0, PI));
  vec2 cd = (uv - foot) * vec2(aspect(), 1.0);
  float wall = step(abs(cd.x), 0.1) * step(-crown, cd.y) * step(cd.y, 0.0) * (0.5 + 0.5 * step(0.3, fract(cd.x * 30.0)));
  c = mix(c, vec3(0.75, 0.9, 1.0), wall * 0.8);
  outColor = vec4(c, 1.0);
}
