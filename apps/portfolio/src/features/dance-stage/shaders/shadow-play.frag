// note: 布の幕の後ろにランプを置き、幕に映る踊る人の影を見せる。影の縁は柔らかくぼけ、ランプの光は中央が明るく少し揺らぐ。
void main() {
  float flicker = 0.95 + 0.05 * noise(vec2(time * 3.0, 0.0));
  vec3 cloth = vec3(1.0, 0.88, 0.65) * (0.55 + 0.6 * exp(-dist(uv, vec2(0.5, 0.45)) * 1.6)) * flicker;
  cloth *= 0.93 + 0.07 * step(0.5, fract(uv.x * 220.0)) * step(0.5, fract(uv.y * 130.0));
  float shadow = 0.0;
  for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) shadow += matte(uv * 0.95 + 0.025 + vec2(float(i), float(j)) * 0.004);
  shadow /= 25.0;
  vec3 c = cloth * (1.0 - 0.85 * shadow);
  outColor = vec4(c, 1.0);
}
