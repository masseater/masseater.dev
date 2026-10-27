// note: 奥の壁と左右の壁と床に囲まれた部屋を描き、壁には流れる色の模様を、床には踊る人の足元から広がる波紋を投影する。人は部屋の中央に立つ。
void main() {
  vec2 lo = vec2(0.22, 0.12);
  vec2 hi = vec2(0.78, 0.68);
  vec3 c;
  if (uv.y > hi.y) {
    float depth = (uv.y - hi.y) / (1.0 - hi.y);
    float x = (uv.x - 0.5) / mix(hi.x - 0.5, 0.75, depth) * 0.5 + 0.5;
    vec2 floorUV = vec2(x, depth);
    vec2 foot = vec2((joint(27).x + joint(28).x) * 0.5, 0.5);
    float r = length((floorUV - foot) * vec2(1.0, 0.6));
    c = vec3(0.05, 0.1, 0.25) + vec3(0.3, 0.7, 1.0) * (0.5 + 0.5 * sin(r * 40.0 - time * 5.0)) * exp(-r * 2.0);
  } else if (uv.x < lo.x || uv.x > hi.x || uv.y < lo.y) {
    float side = step(0.5, uv.x);
    vec2 q = uv * vec2(3.0, 2.0);
    c = hsv(vec3(fract(q.y * 0.3 + q.x * 0.1 + time * 0.08 + side * 0.3), 0.7, 0.55));
    c *= 0.7 + 0.3 * sin(q.x * 6.0 + time);
  } else {
    vec2 q = (uv - lo) / (hi - lo);
    c = hsv(vec3(fract(q.x * 0.5 + time * 0.05), 0.6, 0.7 + 0.2 * sin(q.y * 20.0 + time * 2.0)));
  }
  c = mix(c, c * 0.6, smoothstep(0.004, 0.0, min(segment(uv, vec2(0.0, 1.0), vec2(lo.x, hi.y)), segment(uv, vec2(1.0, 1.0), vec2(hi.x, hi.y)))));
  c = mix(c, rgb(uv), matte(uv));
  outColor = vec4(c, 1.0);
}
