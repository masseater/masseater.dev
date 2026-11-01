// note: 紙の束の 1 枚ごとに、鉛筆でなぞった踊りを描き、1 秒 12 枚の速さでめくる。右下では次の紙がめくれ上がって見える。
void main() {
  float page = floor(time * 12.0);
  float t = page / 12.0;
  float e = 0.003;
  float edge = abs(pastMatte(uv + vec2(e, 0.0), t) - pastMatte(uv - vec2(e, 0.0), t)) + abs(pastMatte(uv + vec2(0.0, e * 1.7), t) - pastMatte(uv - vec2(0.0, e * 1.7), t));
  float shade = (1.0 - luma(pastRgb(uv, t))) * pastMatte(uv, t);
  float hatch = step(0.6, fract((uv.x + uv.y) * 120.0)) * step(0.45, shade);
  vec3 paper = vec3(0.97, 0.95, 0.9) * (0.97 + 0.03 * noise(uv * 300.0));
  vec3 c = mix(paper, vec3(0.25, 0.25, 0.3), clamp(edge * 1.5 + hatch * 0.5, 0.0, 1.0));
  float curl = fract(time * 12.0);
  float corner = (1.0 - uv.x) + (1.0 - uv.y);
  float lift = 0.35 * curl;
  if (corner < lift) c = mix(vec3(0.85, 0.83, 0.78), vec3(0.7, 0.68, 0.64), corner / max(lift, 0.01));
  c *= 1.0 - 0.25 * smoothstep(lift + 0.03, lift, corner) * step(lift, corner);
  outColor = vec4(c, 1.0);
}
