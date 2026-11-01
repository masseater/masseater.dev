// note: 60 羽の鳥の群れが、踊る人の両手首を目当てにして周りを旋回する。1 羽ずつの向きと速さは少しずつ違い、群れ全体で手の動きを追う。
void main() {
  vec3 c = rgb(uv) * 0.8;
  for (int i = 0; i < 60; i++) {
    float fi = float(i);
    vec2 target = joint(i < 30 ? 15 : 16);
    float speed = 1.5 + hash(vec2(fi, 1.0));
    float radius = 0.05 + 0.1 * hash(vec2(fi, 2.0));
    float a = time * speed + fi * 0.37;
    vec2 wobble = vec2(sin(time * 0.7 + fi), cos(time * 0.9 + fi * 1.3)) * 0.02;
    vec2 pos = target + vec2(cos(a) / aspect(), sin(a) * 0.7) * radius + wobble;
    vec2 vel = normalize(vec2(-sin(a) / aspect(), cos(a) * 0.7));
    vec2 q = (uv - pos) * vec2(aspect(), 1.0);
    vec2 local = vec2(dot(q, vel * vec2(aspect(), 1.0) / length(vel * vec2(aspect(), 1.0))), 0.0);
    vec2 v = normalize(vel * vec2(aspect(), 1.0));
    local = vec2(dot(q, v), dot(q, vec2(-v.y, v.x)));
    float bird = step(-0.012, local.x) * step(local.x, 0.006) * step(abs(local.y), (0.006 - local.x) * 0.5);
    c = mix(c, vec3(0.08, 0.08, 0.15), bird);
  }
  outColor = vec4(c, 1.0);
}
