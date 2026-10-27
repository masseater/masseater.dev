// note: 明るい所の光を周りへ柔らかく広げ、画全体を朝の空気のようにふんわりさせる。
void main() {
  vec3 c = rgb(uv);
  vec3 soft = blurRgb(uv, 0.012);
  vec3 bright = max(soft - 0.55, 0.0) * 1.8;
  vec3 outc = 1.0 - (1.0 - c) * (1.0 - bright);
  outc = mix(outc, soft, 0.2);
  outColor = vec4(outc, 1.0);
}
