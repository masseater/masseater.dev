// note: 自宅で別々に撮ったビデオ通話の画面のように、16 人分のマスに少しずつ時間のずれた踊りと、それぞれ違う部屋の明るさを並べる。8 秒ごとにずれが揃っていき、全員の動きが 1 つにそろう。
void main() {
  vec2 grid = vec2(4.0, 4.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  float phase = fract(time / 8.0);
  float sync = smoothstep(0.2, 0.7, phase);
  float lag = (hash(cell) - 0.5) * 1.2 * (1.0 - sync);
  vec2 p = vec2(local.x * 0.55 + 0.28, local.y * 0.7 + 0.05);
  vec3 c = pastRgb(p, time + lag);
  c *= mix(vec3(1.0), vec3(0.8 + 0.4 * hash(cell + 1.0), 0.8 + 0.4 * hash(cell + 2.0), 0.8 + 0.4 * hash(cell + 3.0)), 0.8);
  float border = step(local.x, 0.015) + step(0.985, local.x) + step(local.y, 0.02) + step(0.98, local.y);
  c = mix(c, vec3(0.1), min(border, 1.0));
  outColor = vec4(c, 1.0);
}
