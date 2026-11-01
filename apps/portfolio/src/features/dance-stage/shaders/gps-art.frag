// note: 碁盤の目の街の地図の上に、道だけを通って踊る人の輪郭をなぞる走行記録を描く。赤い線が走った道で、先頭の点が輪郭を一周し続ける。
void main() {
  vec2 grid = vec2(64.0, 36.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  float street = step(local.x, 0.16) + step(local.y, 0.16);
  float avenue = step(abs(uv.x - uv.y * 0.6 - 0.2), 0.004);
  vec3 c = mix(vec3(0.93, 0.9, 0.82), vec3(1.0), min(street + avenue, 1.0));
  c = mix(c, vec3(0.7, 0.85, 0.65), step(0.82, noise(cell * 0.4)) * (1.0 - min(street, 1.0)));
  float here = step(0.5, matte((cell + 0.5) / grid));
  float left = step(0.5, matte((cell + vec2(-0.5, 0.5)) / grid));
  float up = step(0.5, matte((cell + vec2(0.5, -0.5)) / grid));
  float route = step(local.x, 0.16) * abs(here - left) + step(local.y, 0.16) * abs(here - up);
  c = mix(c, vec3(0.9, 0.15, 0.2), min(route, 1.0));
  float run = fract(time / 6.0);
  float a = atan(uv.y - bodyCenter().y, (uv.x - bodyCenter().x) * aspect()) / (2.0 * PI) + 0.5;
  float near = step(abs(a - run), 0.01) * min(route, 1.0);
  c = mix(c, vec3(0.1, 0.3, 0.9), near);
  outColor = vec4(c, 1.0);
}
