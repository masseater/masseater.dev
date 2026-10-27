// note: 部屋を全方位に写した映像として扱い、真下を中心に丸めた小さな惑星の形で見せる。見る向きはゆっくり回り、踊る人は惑星の上で外へ向かって立つ。
void main() {
  vec2 d = (uv - 0.5) * vec2(aspect(), 1.0);
  float r = length(d);
  float a = atan(d.x, d.y) / (2.0 * PI) + 0.5 + time * 0.03;
  float x = fract(a);
  x = abs(x * 2.0 - 1.0);
  float y = 1.0 - clamp(atan(r * 2.2) / (PI * 0.5) * 1.15, 0.0, 1.0);
  vec2 q = vec2(0.1 + x * 0.8, y);
  vec3 c = rgb(q);
  c *= smoothstep(0.85, 0.7, r) * 0.3 + 0.7;
  outColor = vec4(c, 1.0);
}
