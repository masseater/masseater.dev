// note: 速く動いた所だけ、直前 0.1 秒の体の形を一続きにつなげて引き伸ばし、体の色で塗る。手描きアニメで速い動きのコマだけ形を伸ばして描くやり方である。
void main() {
  vec3 c = rgb(uv);
  float m = matte(uv);
  float stretch = 0.0;
  vec3 col = vec3(0.0);
  for (int k = 1; k <= 6; k++) {
    float t = time - float(k) * 0.018;
    float mk = pastMatte(uv, t);
    if (mk > 0.5 && stretch < 0.5) { stretch = 1.0; col = pastRgb(uv, t); }
  }
  c = mix(c, col * 1.05, stretch * (1.0 - m));
  outColor = vec4(c, 1.0);
}
