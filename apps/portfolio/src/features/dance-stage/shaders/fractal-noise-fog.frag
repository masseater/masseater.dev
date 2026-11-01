// note: でたらめで滑らかなむら模様を 2 層重ねて違う向きに流し、床の上に漂う湯気や霧にする。
void main() {
  vec3 c = rgb(uv);
  float a = fbm(uv * vec2(3.0, 5.0) + vec2(time * 0.08, time * 0.03));
  float b = fbm(uv * vec2(5.0, 7.0) - vec2(time * 0.05, -time * 0.04) + a);
  float fog = smoothstep(0.35, 0.8, b) * smoothstep(0.2, 0.9, uv.y);
  c = mix(c, vec3(0.92, 0.94, 0.96), fog * 0.75);
  outColor = vec4(c, 1.0);
}
