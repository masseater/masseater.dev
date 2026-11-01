// note: 5 分の 1 の速さで流す。左半分は同じコマを繰り返すだけなのでカクつき、右半分は前後のコマを混ぜて間を補うので滑らかに動く。
void main() {
  float t = time * 0.2 + 6.0;
  float stepped = floor(t * 15.0) / 15.0;
  vec3 c = uv.x < 0.5 ? pastRgb(uv, stepped) : pastRgb(uv, t);
  c = mix(c, vec3(1.0), step(abs(uv.x - 0.5), 0.002));
  outColor = vec4(c, 1.0);
}
