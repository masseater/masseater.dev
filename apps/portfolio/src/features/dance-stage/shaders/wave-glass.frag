// note: 画面全体を波打つガラス越しのようにゆらめかせ、回想に入るときのように縁を白くぼかす。
void main() {
  vec2 p = uv + vec2(sin(uv.y * 25.0 + time * 2.0), cos(uv.x * 20.0 + time * 1.7)) * 0.006;
  vec3 c = rgb(p);
  float edge = smoothstep(0.3, 0.6, dist(uv, vec2(0.5)));
  c = mix(c, vec3(0.97, 0.95, 0.9), edge * 0.8);
  outColor = vec4(c, 1.0);
}
