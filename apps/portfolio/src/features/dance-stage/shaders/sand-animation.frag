// note: 下から光る台の上に砂をまいて描いたように、暗い所ほど砂を厚く、粒のむらを付けて踊る人を描く。6 秒ごとに手で払ったように砂の帯が消え、また描き直される。
void main() {
  float dark = 1.0 - luma(blurRgb(uv, 0.006));
  float grain = noise(uv * resolution * 0.5) * 0.5 + noise(uv * resolution * 0.13) * 0.5;
  float sand = smoothstep(0.2, 0.8, dark + (grain - 0.5) * 0.35);
  float phase = fract(time / 6.0);
  float sweep = smoothstep(0.05, 0.0, abs(uv.x + (uv.y - 0.5) * 0.4 - phase * 1.6 + 0.2)) * step(0.8, phase);
  float cleared = step(uv.x + (uv.y - 0.5) * 0.4, phase * 1.6 - 0.2) * step(0.8, phase);
  sand *= 1.0 - cleared;
  sand = max(sand, sweep * 0.6);
  vec3 light = vec3(1.0, 0.93, 0.75);
  vec3 c = mix(light, vec3(0.25, 0.17, 0.08), sand);
  outColor = vec4(c, 1.0);
}
