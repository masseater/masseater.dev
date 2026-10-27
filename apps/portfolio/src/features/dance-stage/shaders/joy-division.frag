// note: 黒地に 36 本の白い波形を少しずつ下へずらして重ね、手前の線で奥の線を隠して山並みに見せる。真ん中の山は曲の音量と、踊る人の姿のある所で高くなる。
void main() {
  vec3 c = vec3(0.0);
  float x = uv.x;
  float envelope = exp(-pow((x - 0.5) / 0.16, 2.0));
  for (int i = 0; i < 36; i++) {
    float base = 0.14 + float(i) * 0.022;
    float n = fbm(vec2(x * 14.0, float(i) * 1.7 + time * 0.6));
    float h = envelope * (n * 0.09 + level * 0.04) + matte(vec2(x, base)) * 0.05;
    h += 0.004 * noise(vec2(x * 80.0, float(i)));
    float y = base - h;
    if (uv.y > y) c = vec3(0.0);
    c = mix(c, vec3(1.0), smoothstep(0.0024, 0.0008, abs(uv.y - y)));
  }
  outColor = vec4(c, 1.0);
}
