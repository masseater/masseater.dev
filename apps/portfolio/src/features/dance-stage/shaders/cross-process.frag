// note: 現像の薬を取り違えたように、赤と緑の明暗を強め、青の暗い所を持ち上げて明るい所を抑える。全体が黄緑がかった、色のずれた濃い画になる。
void main() {
  vec3 c = rgb(uv);
  vec3 outc;
  outc.r = smoothstep(0.08, 0.92, c.r);
  outc.g = smoothstep(0.02, 0.9, c.g) * 1.05;
  outc.b = 0.25 + c.b * 0.5;
  outc = mix(outc, outc * vec3(1.05, 1.08, 0.8), 0.6);
  outColor = vec4(clamp(outc, 0.0, 1.0), 1.0);
}
