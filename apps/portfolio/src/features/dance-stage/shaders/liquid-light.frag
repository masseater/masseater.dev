// note: 油と色水を皿に入れて上から投影したように、境目のはっきりした色の塊が渦を巻いてゆっくり混ざり、曲の音量で脈打つ。踊る人はその色を透かして浮かぶ。
void main() {
  vec2 p = uv * vec2(aspect(), 1.0) * 1.6;
  vec2 w = vec2(fbm(p + time * 0.1), fbm(p + 4.0 - time * 0.12));
  float f = fbm(p + w * (2.0 + level * 1.5) + time * 0.05);
  vec3 oil = hsv(vec3(fract(f * 2.0 + time * 0.02), 0.85, 1.0));
  float blob = smoothstep(0.48, 0.5, f) - smoothstep(0.62, 0.64, f);
  oil = mix(oil, vec3(1.0, 0.95, 0.6), blob * 0.6);
  vec3 c = rgb(uv) * (oil * 1.3) * 0.8 + oil * 0.15;
  c = mix(c, rgb(uv) * oil * 1.5, matte(uv) * 0.4);
  outColor = vec4(c, 1.0);
}
