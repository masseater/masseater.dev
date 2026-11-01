// note: 黒い切り絵の影絵のように、踊る人を黒一色にし、まわりに渦を巻く唐草の飾りを黒く切って縁に添える。背景は裏から照らした橙色の紙にする。
void main() {
  vec3 bg = mix(vec3(1.0, 0.75, 0.35), vec3(0.85, 0.4, 0.2), dist(uv, vec2(0.5, 0.45)));
  float m = matte(uv);
  vec2 q = uv * vec2(aspect(), 1.0);
  float vine = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 center = vec2(0.1 + fi * 0.27, 0.95 - 0.08 * hash(vec2(fi, 1.0)));
    vec2 d = q - center;
    float r = length(d);
    float a = atan(d.y, d.x);
    float spiral = abs(fract((log(max(r, 0.001)) * 2.0 - a / (2.0 * PI)) ) - 0.5);
    vine = max(vine, step(spiral, 0.08) * step(r, 0.12) * step(0.01, r));
  }
  float ground = step(0.96, uv.y);
  vec3 c = mix(bg, vec3(0.03), max(max(m, vine), ground));
  outColor = vec4(c, 1.0);
}
