// note: 踊る人を無地の撮影台の真ん中に置き、光の帯を体の表面へゆっくり横切らせ、床には映り込みを落とす。全体はわずかずつ寄っていく。
void main() {
  float zoom = 1.0 + 0.05 * fract(time / 10.0);
  vec2 p = (uv - vec2(0.5, 0.55)) / zoom + vec2(bodyCenter().x, 0.55);
  vec3 bg = mix(vec3(0.95, 0.95, 0.97), vec3(0.6, 0.62, 0.68), length((uv - vec2(0.5, 0.4)) * vec2(1.0, 1.4)));
  vec3 c = bg;
  float m = matte(p) * inside(p);
  float sweep = smoothstep(0.08, 0.0, abs(uv.x - uv.y * 0.3 - fract(time / 4.0) * 1.6 + 0.3));
  c = mix(c, rgb(p) + vec3(1.0) * sweep * 0.5, m);
  if (uv.y > 0.88) {
    vec2 r = vec2(p.x, (1.76 - uv.y - 0.55) / zoom + 0.55);
    c = mix(c, rgb(r) * 0.5 + bg * 0.5, matte(r) * inside(r) * 0.4 * smoothstep(1.0, 0.88, uv.y));
  }
  outColor = vec4(c, 1.0);
}
