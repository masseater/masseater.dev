// note: 白と黒の面を持つドミノを床一面に立てて並べ、斜めに倒れていく波で絵を見せる。立っているうちは上の縁しか見えず、倒れたドミノの面が並んで今の踊りの絵になる。
void main() {
  vec2 grid = vec2(80.0, 36.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  float front = fract(time / 6.0) * 2.4;
  float order = (cell.x / grid.x) * 0.7 + (cell.y / grid.y) * 0.3;
  float fall = clamp((front - order) * 12.0, 0.0, 1.0);
  fall = max(fall, step(1.6, front));
  float height = mix(0.18, 0.92, fall);
  float face = step(0.12, local.x) * step(local.x, 0.88) * step(1.0 - height, local.y) * step(local.y, 0.96);
  float tone = step(0.45, luma(rgb((cell + 0.5) / grid)));
  vec3 piece = mix(vec3(0.08), vec3(0.95), tone);
  piece = mix(vec3(0.85, 0.8, 0.7), piece, fall);
  vec3 c = mix(vec3(0.35, 0.28, 0.22), piece, face);
  outColor = vec4(c, 1.0);
}
