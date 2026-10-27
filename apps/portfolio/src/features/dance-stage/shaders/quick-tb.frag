// note: 4 秒ごとに、顔のアップから回りながら一気に引いて全身を見せ、最後はゆっくり止まる。
void main() {
  float phase = fract(time / 4.0);
  float k = 1.0 - pow(1.0 - min(phase / 0.6, 1.0), 3.0);
  float zoom = mix(3.5, 1.0, k);
  float angle = mix(PI * 0.6, 0.0, k);
  vec2 face = joint(0);
  vec2 center = mix(face, vec2(0.5), k);
  vec2 p = rot((uv - 0.5) * vec2(aspect(), 1.0), angle) / vec2(aspect(), 1.0) / zoom + center;
  outColor = vec4(rgbOr(p, vec3(0.1)), 1.0);
}
