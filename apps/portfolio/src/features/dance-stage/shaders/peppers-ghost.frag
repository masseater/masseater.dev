// note: 暗い舞台の前に斜めの透明な板を置き、袖から映した踊る人の像を板に映り込ませる。像は青白く透けて舞台の上に浮かび、板の縁と照り返しがうっすら見える。
void main() {
  vec3 stage = plate(uv) * vec3(0.15, 0.13, 0.18);
  stage += vec3(0.3, 0.2, 0.1) * smoothstep(0.75, 1.0, uv.y) * 0.4;
  float flick = 0.9 + 0.1 * noise(vec2(time * 8.0, 0.0));
  vec3 ghost = rgb(uv) * matte(uv) * vec3(0.7, 0.9, 1.2) * flick;
  vec3 c = stage + ghost * 0.85;
  float glassEdge = smoothstep(0.003, 0.0, abs(uv.x - 0.08 - uv.y * 0.05) * aspect()) + smoothstep(0.003, 0.0, abs(uv.x - 0.92 + uv.y * 0.05) * aspect());
  c += vec3(0.25) * glassEdge;
  c += vec3(0.04) * smoothstep(0.3, 0.0, abs(uv.x - uv.y * 0.3 - 0.3));
  outColor = vec4(c, 1.0);
}
