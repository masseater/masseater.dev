// note: 暗い舞台に 32 × 18 個の丸い照明を並べ、1 灯を 1 画素とみなして踊りの映像の色で光らせる。上の列の照明からは床へ向けて光の筋を落とす。
void main() {
  vec2 grid = vec2(32.0, 18.0);
  vec2 cell = floor(uv * grid);
  vec2 center = (cell + 0.5) / grid;
  vec3 col = rgb(center);
  col = mix(col * 0.25, col * 1.3, matte(center));
  vec2 local = (fract(uv * grid) - 0.5) * vec2(aspect() * grid.y / grid.x, 1.0);
  float r = length(local);
  vec3 c = vec3(0.01);
  c += col * smoothstep(0.32, 0.26, r);
  c += col * exp(-r * 6.0) * 0.3;
  c = mix(c, vec3(0.06), step(0.32, r) * step(r, 0.38));
  float beamCell = floor(uv.x * grid.x);
  vec3 topCol = rgb(vec2((beamCell + 0.5) / grid.x, 0.5 / grid.y));
  float beam = exp(-pow((fract(uv.x * grid.x) - 0.5) * 3.0, 2.0)) * uv.y * 0.06;
  c += topCol * beam * step(mod(beamCell, 4.0), 0.0);
  outColor = vec4(c, 1.0);
}
