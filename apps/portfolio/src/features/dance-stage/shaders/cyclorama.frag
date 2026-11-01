// note: 壁と床の境目が見えない白一色の背景に踊る人を置き、床に落ちる柔らかい影だけを残す。部屋が消え、どこでもない空間で踊っているように見える。
void main() {
  vec3 c = vec3(0.97) - 0.06 * smoothstep(0.4, 1.0, uv.y);
  float footY = max(joint(27).y, joint(28).y);
  float shadow = 0.0;
  for (int i = -2; i <= 2; i++) shadow += matte(vec2(uv.x - (uv.y - footY) * 0.6 + float(i) * 0.01, footY - (uv.y - footY) * 3.0));
  shadow = shadow / 5.0 * step(footY - 0.02, uv.y) * (1.0 - smoothstep(footY, footY + 0.12, uv.y));
  c *= 1.0 - shadow * 0.35;
  c = mix(c, rgb(uv), matte(uv));
  outColor = vec4(c, 1.0);
}
