// note: 後ろから強い光を当てたように、体の縁を赤く透かして光らせる。光が皮膚の中で散らばって赤くにじむ様子を、輪郭の内側の柔らかい赤い光で描く。
void main() {
  float m = matte(uv);
  float inner = 0.0;
  for (int i = -3; i <= 3; i++) for (int j = -3; j <= 3; j++) inner += matte(uv + vec2(float(i), float(j)) * 0.006);
  inner /= 49.0;
  float rim = clamp((m - inner) * 3.0 + (1.0 - inner) * m * 0.8, 0.0, 1.0);
  vec3 body = rgb(uv) * 0.45;
  vec3 glow = vec3(1.0, 0.35, 0.2) * rim * 1.4 + vec3(1.0, 0.85, 0.7) * pow(rim, 3.0);
  vec3 bg = mix(vec3(1.0, 0.92, 0.8), vec3(0.6, 0.5, 0.45), dist(uv, vec2(0.5, 0.4)));
  vec3 c = mix(bg, body + glow, m);
  outColor = vec4(c, 1.0);
}
