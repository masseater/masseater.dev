// note: 昼に撮った部屋を、暗く青く沈めて夜に見せる。暗い所は黒に近づけ、明るい所だけを月明かりのように青白く残す。
void main() {
  vec3 c = rgb(uv);
  float l = luma(c);
  vec3 night = vec3(0.35, 0.5, 0.85) * pow(l, 2.2) * 0.9;
  night += vec3(0.6, 0.7, 0.9) * smoothstep(0.75, 1.0, l) * 0.15;
  night *= 1.0 - 0.4 * dist(uv, vec2(0.5));
  outColor = vec4(night, 1.0);
}
