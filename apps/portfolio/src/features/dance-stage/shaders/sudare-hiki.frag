// note: 床の下半分に、遠くの水面の照り返しのような細い横の光の帯を並べ、帯ごとにゆらゆら、ちらちらと明るさを変える。
void main() {
  vec3 c = rgb(uv);
  float band = floor(uv.y * 120.0);
  float wobble = sin(uv.x * 40.0 + time * 3.0 + band * 1.7) * 0.5 + 0.5;
  float sparkle = step(0.82, noise(vec2(uv.x * 30.0 - time * 2.0, band)));
  float lit = wobble * sparkle * smoothstep(0.55, 0.9, uv.y);
  c += vec3(1.0, 0.95, 0.85) * lit * 0.7;
  outColor = vec4(c, 1.0);
}
