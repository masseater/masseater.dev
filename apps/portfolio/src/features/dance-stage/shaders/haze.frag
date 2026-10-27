// note: 舞台に煙を満たして、上から差す 4 本の光の筋を見えるようにし、床には低く這う白い霧をゆっくり流して、踊る人が雲の上に立っているように見せる。
void main() {
  vec3 c = rgb(uv) * 0.35;
  c = mix(c, rgb(uv) * 0.7, matte(uv));
  float smoke = fbm(uv * vec2(4.0, 3.0) + vec2(time * 0.05, -time * 0.03));
  for (int i = 0; i < 4; i++) {
    float x = 0.15 + float(i) * 0.23 + sin(time * 0.3 + float(i)) * 0.05;
    float w = 0.03 + uv.y * 0.1;
    float beam = smoothstep(w, 0.0, abs(uv.x - x - (uv.y - 0.5) * 0.1 * (float(i) - 1.5)));
    c += vec3(0.9, 0.85, 1.0) * beam * (0.25 + 0.5 * smoke) * 0.6;
  }
  float fogY = 0.78 + 0.04 * fbm(vec2(uv.x * 3.0 + time * 0.15, 0.0));
  float fog = smoothstep(fogY - 0.06, fogY + 0.08, uv.y) * (0.7 + 0.3 * fbm(vec2(uv.x * 6.0 - time * 0.2, uv.y * 8.0)));
  c = mix(c, vec3(0.92), fog);
  outColor = vec4(c, 1.0);
}
