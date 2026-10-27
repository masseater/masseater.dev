// note: 2 拍ごとに、ズームの途中を飛ばして、全身と顔のアップとを一瞬で切り替える。
void main() {
  float close = mod(floor(beatCount / 2.0), 2.0);
  vec2 face = joint(0) + vec2(0.0, 0.08);
  vec2 p = mix(uv, (uv - 0.5) / 2.4 + face, close);
  outColor = vec4(rgb(p), 1.0);
}
