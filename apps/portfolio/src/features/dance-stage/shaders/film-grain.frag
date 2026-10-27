// note: 粒子のノイズ、縦に走る傷、ちらつく露出、セピアの色かぶりで古いフィルムにする。
void main() {
  float flick = 0.92 + 0.08 * hash(vec2(floor(time * 24.0), 0.0));
  vec3 c = vec3(luma(rgb(uv))) * vec3(1.07, 0.98, 0.82) * flick;
  c += (hash(uv * resolution + floor(time * 24.0)) - 0.5) * 0.18;
  float scratch = step(0.997, hash(vec2(floor(uv.x * 400.0), floor(time * 6.0))));
  c = mix(c, vec3(0.95), scratch * 0.6);
  float dust = step(0.9993, hash(floor(uv * resolution / 3.0) + floor(time * 24.0)));
  c = mix(c, vec3(0.05), dust);
  float vig = smoothstep(0.85, 0.3, length(uv - 0.5));
  outColor = vec4(c * vig, 1.0);
}
