// note: 走査線ごとに色を変えた金属のような横縞を、上下にばらばらの速さで弾ませ、その前で踊る人を踊らせる。背景の部屋は消す。
void main() {
  vec3 c = vec3(0.02, 0.02, 0.06);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float y = 0.5 + 0.4 * sin(time * 1.5 + fi * 0.55);
    float d = abs(uv.y - y) / 0.035;
    vec3 col = hsv(vec3(fi / 6.0, 0.8, 1.0));
    vec3 bar = col * (1.0 - d * d) * 1.3;
    c = d < 1.0 ? bar : c;
  }
  c = mix(c, rgb(uv), matte(uv));
  outColor = vec4(c, 1.0);
}
