// note: 体の表面の傾きと時間で色相を回し、見る角度で虹色に変わる玉虫のような服にする。背景はそのまま残す。
void main() {
  vec3 c = rgb(uv);
  float e = 0.004;
  vec2 g = vec2(luma(rgb(uv + vec2(e, 0.0))) - luma(rgb(uv - vec2(e, 0.0))), luma(rgb(uv + vec2(0.0, e))) - luma(rgb(uv - vec2(0.0, e))));
  float angle = atan(g.y, g.x) / (2.0 * PI) + luma(c) * 1.5 + time * 0.15;
  vec3 film = hsv(vec3(fract(angle), 0.7, 1.0));
  vec3 skin = smoothstep(0.08, 0.0, dist(uv, joint(0))) * vec3(1.0);
  float cloth = matte(uv) * (1.0 - skin.r);
  vec3 outc = mix(c, film * (0.35 + 0.8 * luma(c)), cloth * 0.85);
  outColor = vec4(outc, 1.0);
}
