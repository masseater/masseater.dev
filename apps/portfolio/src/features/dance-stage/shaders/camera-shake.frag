// note: 手持ちのカメラのように、ノイズで位置と傾きを小刻みに揺らし、揺れの速い瞬間だけ少しぶらす。
void main() {
  vec2 off = vec2(fbm(vec2(time * 2.0, 3.0)) - 0.5, fbm(vec2(time * 2.0, 9.0)) - 0.5) * 0.06;
  float a = (fbm(vec2(time * 1.5, 5.0)) - 0.5) * 0.06;
  vec3 c = vec3(0);
  for (int i = 0; i < 6; i++) {
    float t = time - float(i) * 0.008;
    vec2 o = vec2(fbm(vec2(t * 2.0, 3.0)) - 0.5, fbm(vec2(t * 2.0, 9.0)) - 0.5) * 0.06;
    vec2 q = rot((uv - 0.5) * vec2(aspect(), 1.0), a) / vec2(aspect(), 1.0) / 1.08 + 0.5 + o;
    c += rgb(q);
  }
  outColor = vec4(c / 6.0 + 0.0 * off.x, 1.0);
}
