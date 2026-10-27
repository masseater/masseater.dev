// note: 遠い山、中くらいの木、部屋、人物、手前の葉を別々の層にし、横へ流す速さを層ごとに変える。遠い層ほどゆっくり動き、画面に奥行きが出る。
void main() {
  float pan = time * 0.05;
  vec3 c = mix(vec3(0.75, 0.85, 0.95), vec3(0.55, 0.7, 0.9), 1.0 - uv.y);
  float far = 0.3 + 0.1 * fbm(vec2((uv.x + pan * 0.2) * 3.0, 1.0));
  c = mix(c, vec3(0.55, 0.62, 0.75), step(far, uv.y));
  float trees = 0.5 + 0.08 * sin((uv.x + pan * 0.5) * 30.0) + 0.05 * fbm(vec2((uv.x + pan * 0.5) * 10.0, 2.0));
  c = mix(c, vec3(0.25, 0.42, 0.3), step(trees, uv.y));
  vec2 room = vec2(uv.x * 0.6 + 0.2 + sin(pan * 3.0) * 0.05, uv.y);
  float m = matte(room);
  c = mix(c, rgb(room), m);
  vec2 leaf = vec2(uv.x + pan * 3.0, uv.y);
  float leaves = smoothstep(0.55, 0.6, fbm(leaf * vec2(4.0, 3.0))) * (smoothstep(0.3, 0.0, uv.y) + smoothstep(0.75, 1.0, uv.y));
  c = mix(c, vec3(0.1, 0.25, 0.12), leaves);
  outColor = vec4(c, 1.0);
}
