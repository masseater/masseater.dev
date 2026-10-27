// note: 実写の踊りを 1 秒 12 コマに間引き、各コマを平らな色の塗りと黒い輪郭線でなぞったアニメの絵にする。
void main() {
  float t = floor(time * 12.0) / 12.0;
  vec3 c = pastRgb(uv, t);
  float m = pastMatte(uv, t);
  vec3 flat_ = floor(c * 4.0 + 0.5) / 4.0;
  float e = 0.004;
  float edge = abs(pastMatte(uv + vec2(e, 0.0), t) - pastMatte(uv - vec2(e, 0.0), t)) + abs(pastMatte(uv + vec2(0.0, e * 1.7), t) - pastMatte(uv - vec2(0.0, e * 1.7), t));
  float inner = abs(luma(pastRgb(uv + vec2(e, 0.0), t)) - luma(pastRgb(uv - vec2(e, 0.0), t))) + abs(luma(pastRgb(uv + vec2(0.0, e * 1.7), t)) - luma(pastRgb(uv - vec2(0.0, e * 1.7), t)));
  vec3 paper = vec3(0.96, 0.94, 0.88);
  vec3 col = mix(paper, flat_ * 1.1, m);
  col = mix(col, vec3(0.1), clamp(edge * 2.0 + step(0.25, inner) * m, 0.0, 1.0));
  outColor = vec4(col, 1.0);
}
