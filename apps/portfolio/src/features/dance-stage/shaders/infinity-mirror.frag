// note: 向かい合う鏡の間のように、踊りの映像を 8 割ずつ縮めて奥へ何重にも並べ、それぞれの縁を電球の列で光らせる。奥へ行くほど暗くなり、トンネルが続いて見える。
void main() {
  vec2 p = uv - 0.5;
  float level_ = max(abs(p.x), abs(p.y) * 1.0) * 2.0;
  float n = floor(log(max(level_, 1e-4)) / log(0.82));
  n = max(n, 0.0);
  float scale = pow(0.82, n);
  vec2 q = p / scale + 0.5;
  vec3 c = rgb(clamp(q, 0.0, 1.0)) * pow(0.8, n);
  vec2 e = abs(q - 0.5);
  float border = max(e.x, e.y);
  float rim = smoothstep(0.47, 0.5, border);
  float bulbs = step(0.5, fract((e.x > e.y ? q.y : q.x) * 24.0 + n * 0.5));
  c = mix(c, vec3(1.0, 0.8, 0.5) * (0.4 + 0.6 * bulbs) * pow(0.85, n), rim);
  outColor = vec4(c, 1.0);
}
