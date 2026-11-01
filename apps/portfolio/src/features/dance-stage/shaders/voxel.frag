// note: 人物を小さな立方体の積み重ねで描く。立方体ごとに上の面を明るく、右の面を暗くして、1 個ずつの形が見えるようにする。
void main() {
  vec2 grid = vec2(64.0, 36.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  vec2 center = (cell + 0.5) / grid;
  vec3 c = plate(uv) * 0.6;
  float m = step(0.5, matte(center));
  vec3 col = rgb(center);
  float top = step(local.y, 0.22);
  float side = step(0.78, local.x) * (1.0 - top);
  vec3 cube = col * (1.0 + 0.35 * top - 0.35 * side);
  cube *= 1.0 - 0.3 * (step(local.x, 0.03) + step(local.y, 0.03));
  c = mix(c, cube, m);
  outColor = vec4(c, 1.0);
}
