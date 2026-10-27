// note: 踊る人の輪郭をぼかして高さとみなし、空気を入れて膨らませた風船のような立体にする。高さの傾きで陰と白い照り返しを付け、淡い桃色のつやのある形にする。
float height(vec2 p) {
  float h = 0.0;
  for (int i = -3; i <= 3; i++) for (int j = -3; j <= 3; j++) {
    h += matte(p + vec2(float(i), float(j)) * vec2(0.012 / aspect(), 0.012));
  }
  return h / 49.0;
}
void main() {
  float e = 0.006;
  float h = height(uv);
  float hx = height(uv + vec2(e / aspect(), 0.0)) - height(uv - vec2(e / aspect(), 0.0));
  float hy = height(uv + vec2(0.0, e)) - height(uv - vec2(0.0, e));
  vec3 n = normalize(vec3(-hx * 6.0, hy * 6.0, 0.35));
  vec3 lightDir = normalize(vec3(-0.5, 0.6, 0.7));
  float diffuse = max(dot(n, lightDir), 0.0);
  float spec = pow(max(dot(reflect(-lightDir, n), vec3(0.0, 0.0, 1.0)), 0.0), 30.0);
  vec3 base = vec3(1.0, 0.68, 0.82);
  vec3 balloon = base * (0.45 + 0.6 * diffuse) + vec3(1.0) * spec * 0.9;
  vec3 bg = mix(vec3(0.78, 0.9, 1.0), vec3(0.95, 0.88, 1.0), uv.y);
  float shadow = smoothstep(0.0, 0.5, height(uv - vec2(0.02, -0.03))) * 0.15;
  vec3 c = mix(bg * (1.0 - shadow), balloon, smoothstep(0.32, 0.4, h));
  outColor = vec4(c, 1.0);
}
