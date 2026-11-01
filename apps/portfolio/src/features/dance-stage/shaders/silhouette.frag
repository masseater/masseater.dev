// note: 人を黒一色に抜き、鮮やかな単色の背景の前で踊らせる。背景の色は 2 拍ごとに切り替える。
void main() {
  vec3 colors[5] = vec3[5](vec3(0.95, 0.2, 0.55), vec3(0.2, 0.75, 0.95), vec3(0.6, 0.9, 0.2), vec3(1.0, 0.75, 0.1), vec3(0.6, 0.35, 0.95));
  vec3 bg = colors[int(mod(floor(beatCount / 2.0), 5.0))];
  vec3 c = mix(bg, vec3(0.02), matte(uv));
  outColor = vec4(c, 1.0);
}
