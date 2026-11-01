// note: 曲の 8 つの音域の強さで、画面の行ごとに画を左右へ押し出し、明るい所ほど大きくゆがませる。音が大きい瞬間に画が波打つ。
void main() {
  int band = int(clamp(uv.y * 8.0, 0.0, 7.0));
  float push = bands[band] * 0.06 * sin(uv.y * 40.0 + time * 6.0);
  float l = luma(rgb(uv));
  vec2 p = uv + vec2(push * (0.5 + l), (l - 0.5) * level * 0.08);
  outColor = vec4(rgb(p), 1.0);
}
