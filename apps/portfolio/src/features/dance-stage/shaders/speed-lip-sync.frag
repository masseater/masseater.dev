// note: 人物だけを倍の速さで流し、背景はふつうの速さのまま置く。倍速リップシンクは半分の速さで演じて倍速に戻すので、体の動きがせわしなく見える。
void main() {
  float t = time * 2.0;
  vec3 c = mix(plate(uv), pastRgb(uv, t), pastMatte(uv, t));
  float n = number(uv, vec2(0.05, 0.06), 0.08, 2.0, 1);
  c = mix(c, vec3(1.0), n);
  outColor = vec4(c, 1.0);
}
