// note: 黒い丸の窓を顔に向かって絞り込んで閉じ、閉じきったら別の瞬間の画で丸を開く。無声映画の場面転換のやり方。
void main() {
  float phase = fract(time / 4.0);
  float r = phase < 0.5 ? mix(1.2, 0.05, smoothstep(0.1, 0.5, phase)) : mix(0.05, 1.2, smoothstep(0.5, 0.9, phase));
  vec2 center = phase < 0.5 ? joint(0) : vec2(0.5);
  float t = phase < 0.5 ? time : time + 7.0;
  vec3 c = phase < 0.5 ? rgb(uv) : pastRgb(uv, t);
  c = mix(vec3(luma(c)), c, 0.3);
  float mask = smoothstep(r, r - 0.01, dist(uv, center));
  outColor = vec4(c * mask, 1.0);
}
