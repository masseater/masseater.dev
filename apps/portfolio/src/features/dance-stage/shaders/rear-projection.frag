// note: 走る車の後ろの窓の景色のように、踊る人の後ろのスクリーンに流れる道路の景色を映す。スクリーンの画は少し眠くて中央だけ明るく、手前の人物とは質感が違う。
void main() {
  float x = uv.x + time * 0.25;
  vec3 sky = mix(vec3(0.75, 0.85, 0.95), vec3(0.55, 0.7, 0.9), 1.0 - uv.y);
  float hills = 0.45 + 0.08 * fbm(vec2(x * 1.5, 0.0));
  vec3 land = mix(vec3(0.35, 0.5, 0.3), vec3(0.25, 0.4, 0.22), noise(vec2(x * 8.0, uv.y * 5.0)));
  vec3 screen = mix(sky, land, step(hills, uv.y));
  float pole = step(fract(x * 2.0), 0.015) * step(0.3, uv.y);
  screen = mix(screen, vec3(0.3, 0.25, 0.2), pole);
  float road = step(0.78, uv.y);
  screen = mix(screen, vec3(0.3) + 0.6 * step(0.5, fract(x * 6.0)) * step(abs(uv.y - 0.86), 0.006), road);
  screen = mix(vec3(luma(screen)), screen, 0.75) * (0.75 + 0.35 * exp(-dist(uv, vec2(0.5)) * 2.0));
  vec3 c = mix(screen, rgb(uv) * 1.05, matte(uv));
  outColor = vec4(c, 1.0);
}
