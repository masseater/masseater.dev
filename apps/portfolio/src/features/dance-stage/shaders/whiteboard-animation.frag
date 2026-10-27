// note: 白板の上に、ペンが左上から順に線を引いて踊る人の絵を描き上げていく。描き終えた絵は 1 秒見せてから消し、次の瞬間の絵を描き始める。
void main() {
  float cycle = floor(time / 6.0);
  float phase = fract(time / 6.0);
  float t = cycle * 6.0 + 1.0;
  vec3 c = vec3(0.97, 0.98, 0.98);
  float e = 0.004;
  float edge = abs(pastMatte(uv + vec2(e, 0.0), t) - pastMatte(uv - vec2(e, 0.0), t)) + abs(pastMatte(uv + vec2(0.0, e * 1.7), t) - pastMatte(uv - vec2(0.0, e * 1.7), t));
  float inner = step(0.15, abs(luma(pastRgb(uv + vec2(e, 0.0), t)) - luma(pastRgb(uv - vec2(e, 0.0), t)))) * pastMatte(uv, t);
  float ink = clamp(edge * 1.5 + inner * 0.6, 0.0, 1.0);
  float progress = smoothstep(0.0, 0.8, phase) * 1.3;
  float order = uv.y + uv.x * 0.15;
  float drawn = step(order, progress);
  c = mix(c, vec3(0.1, 0.12, 0.2), ink * drawn);
  vec2 pen = vec2(0.45 + 0.15 * sin(time * 9.0), progress - 0.07);
  vec2 d = (uv - pen) * vec2(aspect(), 1.0);
  float body = step(abs(d.x - d.y * 0.4), 0.012) * step(0.0, d.y) * step(d.y, 0.18);
  c = mix(c, vec3(0.2, 0.3, 0.7), body * step(phase, 0.82));
  c = mix(c, vec3(0.85, 0.75, 0.65), smoothstep(0.06, 0.05, length(d - vec2(0.07, 0.2))) * step(phase, 0.82));
  outColor = vec4(c, 1.0);
}
