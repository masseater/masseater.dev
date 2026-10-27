// note: 部屋の奥に描いた山並みを 3 層重ね、遠い層ほど色を薄く青くかすませる。手前の人物はいちばん濃い色のまま残し、奥行きを強める。
void main() {
  vec3 sky = mix(vec3(0.85, 0.9, 0.97), vec3(0.6, 0.72, 0.9), 1.0 - uv.y);
  vec3 c = sky;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float ridge = 0.35 + fi * 0.15 + 0.08 * fbm(vec2(uv.x * (2.0 + fi) + fi * 3.0, fi));
    vec3 hill = mix(vec3(0.2, 0.3, 0.25), sky, 0.75 - fi * 0.3);
    c = mix(c, hill, step(ridge, uv.y));
  }
  c = mix(c, rgb(uv), matte(uv));
  outColor = vec4(c, 1.0);
}
