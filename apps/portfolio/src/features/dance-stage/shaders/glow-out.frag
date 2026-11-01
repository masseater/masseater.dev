// note: 6 秒ごとに、強い光を浴びたように明るい所から白く飛んでいき、画面全体が白に溶けてから、またゆっくり戻る。白くなるまでに 1 秒以上かけ、点滅にはしない。
void main() {
  float phase = fract(time / 6.0);
  float k = smoothstep(0.5, 0.75, phase) * (1.0 - smoothstep(0.8, 1.0, phase));
  vec3 c = rgb(uv);
  vec3 soft = blurRgb(uv, 0.01);
  vec3 glow = c + max(soft - 0.4, 0.0) * 2.5 * k;
  outColor = vec4(mix(glow, vec3(1.0), smoothstep(0.4, 1.0, k)), 1.0);
}
