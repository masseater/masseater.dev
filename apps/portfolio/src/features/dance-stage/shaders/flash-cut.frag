// note: 2 拍ごとにカットを替え、替わる瞬間に白い光を一瞬はさむ。光る回数は 1 秒に 2 回より少ない。
void main() {
  float shot = mod(floor(beatCount / 2.0), 3.0);
  float since = mod(beatCount, 2.0) < 0.5 ? beat : 10.0;
  vec2 p = uv;
  if (shot > 0.5) p = (uv - 0.5) / 1.6 + bodyCenter();
  if (shot > 1.5) p = vec2(1.0 - uv.x, uv.y);
  vec3 c = rgb(p);
  c = mix(c, vec3(1.0), exp(-since * 14.0));
  outColor = vec4(c, 1.0);
}
