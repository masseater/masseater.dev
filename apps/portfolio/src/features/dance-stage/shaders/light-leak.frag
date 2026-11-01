// note: 画面の端から差し込む暖色の光を、ゆっくり動くぼけた光の塊として加算する。
void main() {
  vec3 c = rgb(uv);
  vec2 a = vec2(0.1 + 0.2 * sin(time * 0.4), 0.2 + 0.3 * cos(time * 0.3));
  vec2 b = vec2(0.95, 0.7 + 0.2 * sin(time * 0.5));
  vec3 leak = vec3(1.0, 0.45, 0.15) * smoothstep(0.6, 0.0, length(uv - a)) + vec3(1.0, 0.2, 0.4) * smoothstep(0.5, 0.0, length(uv - b));
  float burn = smoothstep(0.7, 1.0, sin(time * 0.6) * 0.5 + 0.5) * smoothstep(0.3, 1.0, uv.x);
  c = 1.0 - (1.0 - c) * (1.0 - leak * 0.9);
  c = mix(c, vec3(1.0, 0.85, 0.6), burn * 0.8);
  outColor = vec4(c, 1.0);
}
