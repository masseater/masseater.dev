// note: 1 本の線だけで描く。線は画面の左右を往復しながら下りていき、暗い所ほど細かく大きく波打つので、線の混み具合で濃淡が出る。
void main() {
  float rows = 60.0;
  float row = floor(uv.y * rows);
  float y = fract(uv.y * rows) - 0.5;
  float dark = 1.0 - luma(blurRgb(vec2(uv.x, (row + 0.5) / rows), 0.006));
  float dir = mod(row, 2.0) * 2.0 - 1.0;
  float phase = uv.x * aspect() * (40.0 + 260.0 * dark) * dir;
  float wave = 0.45 * dark * sin(phase);
  float lineDist = abs(y - wave) / (1.0 + abs(0.45 * dark * (40.0 + 260.0 * dark) * aspect() / rows * cos(phase)));
  float ink = smoothstep(0.09, 0.03, lineDist);
  outColor = vec4(mix(vec3(0.98, 0.97, 0.94), vec3(0.1, 0.1, 0.15), ink), 1.0);
}
