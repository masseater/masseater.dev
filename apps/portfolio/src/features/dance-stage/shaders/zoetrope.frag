// note: 円盤の縁に、踊りの 12 の瞬間を 1 体ずつ立たせて回す。1 秒に 12 回、ちょうど 1 体分だけ回ったときにだけ明るく照らすので、手前の 1 体がその場で踊っているように見える。
void main() {
  vec3 c = mix(vec3(0.05, 0.05, 0.08), vec3(0.12, 0.1, 0.14), uv.y);
  float step_ = floor(time * 12.0);
  float spin = step_ * 2.0 * PI / 12.0;
  vec2 center = vec2(0.5, 0.62);
  vec2 q = (uv - center) * vec2(aspect(), 1.0);
  float plate = length(q * vec2(1.0, 3.2));
  c = mix(c, vec3(0.35, 0.25, 0.2), smoothstep(0.62, 0.6, plate));
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 2.0 * PI / 12.0 + spin;
    vec2 foot = center + vec2(sin(a) * 0.3 / aspect() * 1.6, cos(a) * 0.09);
    float depth = 0.55 + 0.45 * cos(a);
    float h = 0.5 * depth;
    vec2 p = vec2((uv.x - foot.x) / (h * 0.6 / aspect() * 1.778) + 0.55, (uv.y - foot.y) / h + 1.0);
    if (inside(p) < 0.5) continue;
    float t = (float(i) + step_) / 12.0;
    float m = pastMatte(p, t);
    vec3 figure = pastRgb(p, t) * (0.4 + 0.6 * depth);
    c = mix(c, figure, m * step(cos(a), 2.0));
  }
  outColor = vec4(c, 1.0);
}
