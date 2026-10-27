// note: 36 の瞬間を 6×6 に貼り合わせた巨大な 1 枚から始め、その中の 1 枚へ 8 秒かけて寄っていく。寄りきると、その 1 枚が今の踊りの映像に切り替わる。
void main() {
  float phase = fract(time / 8.0);
  float k = smoothstep(0.1, 0.9, phase);
  float zoom = pow(6.0, k);
  vec2 target = vec2(3.5, 2.5) / 6.0;
  vec2 p = (uv - 0.5) / zoom + mix(vec2(0.5), target, min(k * 1.4, 1.0));
  vec2 cell = floor(p * 6.0);
  vec2 local = fract(p * 6.0);
  vec3 tile = historyTile(local, hash(cell) * HISTORY_FRAMES + time * HISTORY_FPS, 0.0).rgb;
  if (cell == vec2(3.0, 2.0)) tile = mix(tile, rgb(local), smoothstep(0.4, 0.9, k));
  float seam = (step(local.x, 0.004) + step(local.y, 0.007)) * (1.0 - k);
  outColor = vec4(mix(tile, vec3(0.0), min(seam, 1.0) * 0.4), 1.0);
}
