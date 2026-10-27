// note: 2 秒踊ったら、その瞬間を劇画の止め絵（ハーモニー）に変えて 2 秒止め、次の 2 秒は同じ顔へのズームを 3 回繰り返す。止め絵は色を絞って筆のむらを付ける。
void main() {
  float phase = mod(time, 6.0);
  float base = floor(time / 6.0) * 6.0;
  vec3 c = rgb(uv);
  if (phase >= 2.0 && phase < 4.0) {
    vec3 still = pastRgb(uv, base + 2.0);
    still = floor(still * 4.0 + 0.5) / 4.0;
    still *= 0.85 + 0.3 * fbm(uv * vec2(4.0, 30.0));
    still = mix(still, still * vec3(1.1, 0.9, 0.7), 0.5);
    c = still;
  } else if (phase >= 4.0) {
    float k = fract((phase - 4.0) * 1.5);
    float zoom = mix(1.0, 2.0, smoothstep(0.0, 0.8, k));
    vec2 p = (uv - 0.5) / zoom + mix(vec2(0.5), joint(0) + vec2(0.0, 0.05), smoothstep(0.0, 0.8, k));
    c = pastRgb(p, base + 2.0);
  }
  outColor = vec4(c, 1.0);
}
