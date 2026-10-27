// note: 部屋の壁から上を、描いた雪山と城の景色に置き換え、床と踊る人だけを実写のまま残す。実在しない場所で踊っているように見える。
void main() {
  vec3 sky = mix(vec3(0.95, 0.8, 0.65), vec3(0.45, 0.55, 0.8), 1.0 - uv.y * 1.4);
  float ridge = 0.45 + 0.12 * fbm(vec2(uv.x * 3.0, 0.5)) - 0.1 * exp(-pow((uv.x - 0.3) * 6.0, 2.0));
  vec3 mountain = mix(vec3(0.95), vec3(0.45, 0.5, 0.6), smoothstep(0.0, 0.08, uv.y - ridge));
  vec3 c = mix(sky, mountain, step(ridge, uv.y));
  float castle = step(abs(uv.x - 0.78), 0.04) * step(0.48, uv.y) + step(abs(uv.x - 0.78), 0.012) * step(0.4, uv.y);
  c = mix(c, vec3(0.3, 0.3, 0.38), castle);
  float far = 0.62 + 0.05 * fbm(vec2(uv.x * 8.0, 2.0));
  c = mix(c, vec3(0.25, 0.4, 0.3), step(far, uv.y));
  vec3 room = rgb(uv);
  float floor_ = smoothstep(0.86, 0.9, uv.y);
  c = mix(c, room, max(floor_, matte(uv)));
  outColor = vec4(c, 1.0);
}
