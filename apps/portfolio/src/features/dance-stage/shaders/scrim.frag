// note: 舞台の前に織り目の見える薄い幕を張り、4 秒ごとに照明を切り替える。前から照らすと幕に描いた森の絵だけが見え、後ろを照らすと幕が透けて奥で踊る人が現れる。
void main() {
  float back = smoothstep(0.0, 1.0, abs(mod(time, 8.0) - 4.0) - 1.5);
  vec2 p = uv * vec2(aspect(), 1.0);
  float trunk = step(0.75, fract(p.x * 4.0 + fbm(p * 2.0) * 0.5)) * step(0.3, uv.y);
  vec3 forest = mix(vec3(0.75, 0.85, 0.7), vec3(0.25, 0.45, 0.3), fbm(p * 5.0));
  forest = mix(forest, vec3(0.3, 0.22, 0.15), trunk);
  vec3 behind = rgb(uv);
  vec3 c = mix(forest * 0.9, behind * 0.9 + forest * 0.1, back);
  vec2 weave = fract(uv * resolution / 2.0);
  c *= 0.9 + 0.1 * step(0.5, weave.x);
  outColor = vec4(c, 1.0);
}
