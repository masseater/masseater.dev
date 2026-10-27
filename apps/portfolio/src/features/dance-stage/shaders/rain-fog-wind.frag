// note: 部屋に横殴りの雨を降らせ、床から霧を流し、風で画面全体を横へ揺らす。雨粒は斜めの細い線で、霧はゆっくり流れる濃淡で描く。
void main() {
  float gust = sin(time * 1.3) * 0.5 + 0.5;
  vec2 p = uv + vec2((noise(vec2(uv.y * 6.0, time * 2.0)) - 0.5) * 0.01 * gust, 0.0);
  vec3 c = rgb(p) * 0.75 + vec3(0.02, 0.03, 0.05);
  vec2 q = vec2(uv.x * aspect() + uv.y * (0.25 + 0.2 * gust), uv.y);
  vec2 cell = vec2(floor(q.x * 90.0), 0.0);
  float speed = 2.5 + hash(cell) * 1.5;
  float y = fract(q.y * 3.0 - time * speed + hash(cell + 3.0));
  float drop = step(fract(q.x * 90.0), 0.08) * smoothstep(0.0, 0.05, y) * smoothstep(0.25, 0.05, y);
  c += vec3(0.6, 0.65, 0.75) * drop * 0.6;
  float fog = fbm(vec2(uv.x * 3.0 - time * 0.3 * (1.0 + gust), uv.y * 4.0)) * smoothstep(0.4, 1.0, uv.y);
  c = mix(c, vec3(0.75, 0.78, 0.82), fog * 0.7);
  outColor = vec4(c, 1.0);
}
