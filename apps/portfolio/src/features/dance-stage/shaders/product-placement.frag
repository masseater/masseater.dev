// note: 部屋のソファーの肘掛けに、架空の炭酸飲料の缶をさりげなく置き、部屋の光に合わせて陰を付ける。缶の銘柄の面はいつもこちらを向く。
// text: SEIKIN
void main() {
  vec3 c = rgb(uv);
  vec2 can = vec2(0.88, 0.62);
  vec2 q = (uv - can) * vec2(aspect(), 1.0);
  float w = 0.03;
  float h = 0.08;
  float body = step(abs(q.x), w) * step(abs(q.y), h);
  float x = q.x / w;
  vec3 red = vec3(0.8, 0.08, 0.1) * (0.55 + 0.45 * sqrt(max(1.0 - x * x, 0.0)));
  red += vec3(1.0) * smoothstep(0.15, 0.0, abs(x + 0.45)) * 0.35;
  float rim = step(h - 0.008, abs(q.y));
  vec3 canColor = mix(red, vec3(0.75) * (0.6 + 0.4 * sqrt(max(1.0 - x * x, 0.0))), rim);
  float label = textBox(uv, can, 0.025, 0) * step(abs(x), 0.85);
  canColor = mix(canColor, vec3(1.0), label);
  c = mix(c, canColor, body);
  vec2 sd = (uv - can - vec2(0.01, h)) * vec2(aspect(), 6.0);
  c *= 1.0 - 0.3 * smoothstep(0.06, 0.0, length(sd)) * (1.0 - body);
  outColor = vec4(c, 1.0);
}
