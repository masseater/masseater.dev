// note: C・M・Y・K の 4 版をそれぞれ角度を変えた網点にし、紙の上で重ね刷りしたように乗算する。
float dots(vec2 p, float angle, float value) {
  mat2 r = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 q = r * p * resolution / 7.0;
  vec2 f = fract(q) - 0.5;
  return smoothstep(0.05, -0.05, length(f) - sqrt(value) * 0.62);
}
void main() {
  vec3 c = rgb(uv);
  float k = 1.0 - max(max(c.r, c.g), c.b);
  vec3 cmy = (1.0 - c - k) / max(1.0 - k, 0.001);
  vec3 ink = vec3(1.0);
  ink *= 1.0 - dots(uv, 0.26, cmy.x) * vec3(1.0, 0.0, 0.0);
  ink *= 1.0 - dots(uv, 1.31, cmy.y) * vec3(0.0, 1.0, 0.0);
  ink *= 1.0 - dots(uv, 0.0, cmy.z) * vec3(0.0, 0.0, 1.0);
  ink *= 1.0 - dots(uv, 0.79, k) * 0.9;
  outColor = vec4(ink * vec3(0.98, 0.96, 0.9), 1.0);
}
