// note: 客席から手に持ったスマホで撮っている目線にする。画面の外側をスマホの縁で囲み、手の揺れと録画中の印を重ねる。
void main() {
  vec2 shake = vec2(noise(vec2(time * 1.3, 1.0)) - 0.5, noise(vec2(time * 1.1, 7.0)) - 0.5) * 0.03;
  vec2 q = (uv - 0.5 - shake) * vec2(aspect(), 1.0);
  q = rot(q, 0.04 * sin(time * 0.9));
  vec2 phone = vec2(0.62, 0.36);
  vec2 d = abs(q) - phone;
  float body = length(max(d + 0.04, 0.0)) - 0.04;
  vec2 p = q / (phone * 2.0) * vec2(1.0, 1.0) + 0.5;
  vec3 c = vec3(0.08);
  if (body < 0.0) c = rgb(p);
  float frame = smoothstep(0.0, 0.004, body) * step(body, 0.03);
  c = mix(c, vec3(0.02), frame);
  float rec = step(length((p - vec2(0.06, 0.08)) * vec2(aspect(), 1.0)), 0.015) * step(0.5, fract(time));
  c = mix(c, vec3(0.95, 0.1, 0.1), rec * step(body, 0.0));
  outColor = vec4(c, 1.0);
}
