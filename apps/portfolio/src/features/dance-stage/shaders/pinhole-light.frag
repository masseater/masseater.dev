// note: 画面のあちこちと手首の先で、小さな十字の光をまたたかせる。光は点の針穴から漏れたように細く、明るさがそれぞれの速さで揺れる。
float star(vec2 p, vec2 at, float size) {
  vec2 d = abs((p - at) * vec2(aspect(), 1.0));
  float cross_ = max(smoothstep(size, 0.0, d.x) * smoothstep(0.0025, 0.0, d.y), smoothstep(size, 0.0, d.y) * smoothstep(0.0025, 0.0, d.x));
  return cross_ + smoothstep(0.008, 0.0, length(d));
}
void main() {
  vec3 c = rgb(uv) * 0.85;
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    vec2 at = vec2(hash(vec2(fi, 1.0)), hash(vec2(fi, 2.0)) * 0.7);
    float tw = pow(0.5 + 0.5 * sin(time * (1.5 + hash(vec2(fi, 3.0)) * 2.0) + fi), 3.0);
    c += vec3(1.0, 0.95, 0.8) * star(uv, at, 0.04 * tw) * tw;
  }
  for (int i = 0; i < 2; i++) {
    float tw = 0.6 + 0.4 * sin(time * 3.0 + float(i));
    c += vec3(0.8, 0.95, 1.0) * star(uv, joint(i == 0 ? 15 : 16), 0.06 * tw);
  }
  outColor = vec4(c, 1.0);
}
