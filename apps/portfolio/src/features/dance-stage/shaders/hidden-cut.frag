// note: 黒い柱が手前を横切って画面を一度ふさぎ、ふさがれている間に別の瞬間のカットへ替える。柱が抜けると、切れ目に気づかないまま場面が変わっている。
void main() {
  float phase = fract(time / 3.0);
  float n = floor(time / 3.0);
  float x = mix(-0.6, 1.6, phase);
  float pillar = step(abs(uv.x - x), 0.28 + 0.02 * sin(uv.y * 10.0));
  float after = step(x, uv.x + 0.0) * 0.0 + step(0.5, phase);
  float t = time + (n + after) * 5.0;
  vec3 c = pastRgb(uv, t);
  c = mix(c, vec3(0.03), pillar);
  outColor = vec4(c, 1.0);
}
