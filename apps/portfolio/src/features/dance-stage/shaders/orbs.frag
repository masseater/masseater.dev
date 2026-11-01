// note: 空中のちりがぼけて写ったように、白く半透明の玉を画面の中にいくつも漂わせる。玉は縁だけが少し明るい。
void main() {
  vec3 c = rgb(uv);
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    vec2 at = vec2(fract(hash(vec2(fi, 1.0)) + time * 0.01 * (hash(vec2(fi, 5.0)) - 0.5)), fract(hash(vec2(fi, 2.0)) - time * 0.015));
    float r = 0.03 + 0.04 * hash(vec2(fi, 3.0));
    float d = dist(uv, at) / r;
    float orb = smoothstep(1.0, 0.85, d) * (0.15 + 0.25 * smoothstep(0.6, 0.95, d));
    c = mix(c, vec3(1.0), orb);
  }
  outColor = vec4(c, 1.0);
}
