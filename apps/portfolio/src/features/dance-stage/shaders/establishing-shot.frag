// note: 部屋の映像を窓の一つとして小さく置き、まわりに夕暮れのビルの影を描いて、どこで起きているかを先に見せる。最後に部屋の中へ寄っていく。
// text: 東京・とある部屋　午後 3 時
float building(vec2 q, float column, out float top) {
  top = 0.25 + 0.4 * hash(vec2(column, 1.0));
  return step(top, q.y);
}
void main() {
  float phase = fract(time / 9.6);
  float zoom = mix(1.0, 5.0, smoothstep(0.6, 1.0, phase));
  vec2 win = vec2(0.56, 0.58);
  vec2 q = (uv - 0.5) / zoom + win;
  vec3 c = mix(vec3(0.98, 0.62, 0.38), vec3(0.25, 0.3, 0.55), 1.0 - q.y * 1.4);
  float column = floor(q.x * 9.0);
  float top;
  float body = building(q, column, top);
  vec2 cell = vec2(fract(q.x * 9.0) * 6.0, (q.y - top) * 40.0);
  vec2 local = fract(cell);
  float glass = step(0.3, local.x) * step(local.x, 0.7) * step(0.3, local.y) * step(local.y, 0.75);
  float lit = step(0.55, hash(floor(cell) + column * 17.0));
  vec3 wall = vec3(0.1, 0.1, 0.14) + vec3(1.0, 0.8, 0.45) * glass * lit * 0.5;
  c = mix(c, wall, body);
  vec2 room = (q - win) / 0.2 + 0.5;
  c = mix(c, rgb(room), inside(room));
  float title = textBox(uv, vec2(0.5, 0.12), 0.07, 0) * (1.0 - smoothstep(0.5, 0.6, phase));
  c = mix(c, vec3(1.0), title);
  outColor = vec4(c, 1.0);
}
