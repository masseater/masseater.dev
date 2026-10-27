// note: 踊る人をぼかした輪郭から膨らみの向きを出し、空と床を映し込んだ銀色のクロームの体にする。周りには半透明の水色のプラスチックの泡と、角張ったきらめきを浮かべる。
float height(vec2 p) {
  float h = 0.0;
  for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) h += matte(p + vec2(float(i), float(j)) * vec2(0.01 / aspect(), 0.01));
  return h / 25.0;
}
void main() {
  vec3 c = mix(vec3(0.75, 0.85, 1.0), vec3(0.95, 0.8, 1.0), uv.y);
  for (int i = 0; i < 6; i++) {
    vec2 b = vec2(hash(vec2(float(i), 1.0)), fract(hash(vec2(float(i), 2.0)) - time * 0.05));
    float r = 0.05 + 0.05 * hash(vec2(float(i), 3.0));
    float d = dist(uv, b);
    c = mix(c, vec3(0.5, 0.85, 1.0), smoothstep(r, r - 0.005, d) * 0.35);
    c += vec3(1.0) * smoothstep(r * 0.25, 0.0, dist(uv, b - vec2(r * 0.4 / aspect(), r * 0.4))) * 0.6;
  }
  float e = 0.006;
  float h = height(uv);
  float hx = height(uv + vec2(e / aspect(), 0.0)) - height(uv - vec2(e / aspect(), 0.0));
  float hy = height(uv + vec2(0.0, e)) - height(uv - vec2(0.0, e));
  vec3 n = normalize(vec3(-hx * 5.0, hy * 5.0, 0.4));
  float env = n.y * 0.5 + 0.5;
  vec3 chrome = mix(vec3(0.25, 0.22, 0.3), vec3(0.95, 0.97, 1.0), smoothstep(0.35, 0.65, env));
  chrome += vec3(0.7, 0.8, 1.0) * pow(max(n.x, 0.0), 6.0);
  c = mix(c, chrome, smoothstep(0.35, 0.45, h));
  for (int i = 0; i < 5; i++) {
    vec2 s = vec2(hash(vec2(float(i), 7.0)), hash(vec2(float(i), 8.0)));
    vec2 q = abs(uv - s) * vec2(aspect(), 1.0);
    float star = step(q.x * q.y, 0.00002 * (1.0 + sin(time * 3.0 + float(i)))) * step(max(q.x, q.y), 0.04);
    c = mix(c, vec3(1.0), star);
  }
  outColor = vec4(c, 1.0);
}
