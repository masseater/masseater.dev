// note: クロスワードの盤を作り、黒マスの並びが踊る人の形になるようにする。白マスのうち、語の書き始めに当たるマスには小さな番号を振る。
void main() {
  vec2 grid = vec2(48.0, 27.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  float black = step(0.5, matte((cell + 0.5) / grid));
  float leftBlack = step(0.5, matte((cell + vec2(-0.5, 0.5)) / grid)) + step(cell.x, 0.0);
  float upBlack = step(0.5, matte((cell + vec2(0.5, -0.5)) / grid)) + step(cell.y, 0.0);
  float start = (1.0 - black) * step(0.5, max(leftBlack, upBlack)) * step(0.6, hash(cell));
  vec3 c = mix(vec3(0.98), vec3(0.08), black);
  float line = step(local.x, 0.06) + step(local.y, 0.06);
  c = mix(c, vec3(0.3), min(line, 1.0));
  float n = number(local, vec2(0.1, 0.1), 0.32, mod(cell.x * 7.0 + cell.y * 3.0, 99.0) + 1.0, 2);
  c = mix(c, vec3(0.2), n * start);
  outColor = vec4(c, 1.0);
}
