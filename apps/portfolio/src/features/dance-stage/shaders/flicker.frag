// note: 1 秒 12 回、絵を少しずつずらした 2 枚で入れ替えて、震えやちらつきを出す。明るさは変えず、位置と色味だけを入れ替える。
void main() {
  float step_ = floor(time * 12.0);
  float odd = mod(step_, 2.0);
  vec2 p = uv + (odd - 0.5) * vec2(0.004, 0.003);
  vec3 c = rgb(p);
  c = mix(c, c * vec3(1.03, 0.98, 1.02), odd);
  outColor = vec4(c, 1.0);
}
