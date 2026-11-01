// note: 4 拍ごとに、床の 4 か所から白い煙を 0.8 秒だけ勢いよく吹き上げ、上へ広がりながら薄れて消えさせる。
void main() {
  vec3 c = rgb(uv);
  float on = step(mod(beatCount, 4.0), 0.5);
  float life = clamp(beat / 1.4, 0.0, 1.0) * on + (1.0 - on);
  float smoke = 0.0;
  for (int i = 0; i < 4; i++) {
    float x = 0.12 + float(i) * 0.25;
    float h = 0.85 * smoothstep(0.0, 0.25, beat) * on;
    float y = 1.0 - uv.y;
    float width = 0.01 + y * 0.12;
    float plume = smoothstep(width, 0.0, abs(uv.x - x) * aspect() * 0.6) * step(y, h);
    plume *= 0.6 + 0.6 * fbm(vec2(uv.x * 8.0, uv.y * 5.0 + beat * 6.0));
    smoke += plume;
  }
  smoke *= on * (1.0 - smoothstep(0.5, 1.0, life));
  c = mix(c, vec3(0.95), clamp(smoke, 0.0, 1.0) * 0.9);
  outColor = vec4(c, 1.0);
}
