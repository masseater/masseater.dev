// note: 拍で大きく動く瞬間に合わせて、引きの画と胴に寄った画を切り替える。動きの途中で切るので、つなぎ目が動きに紛れる。
void main() {
  float close = mod(beatCount, 2.0);
  vec2 center = bodyCenter();
  vec2 p = close > 0.5 ? (uv - 0.5) / 1.9 + center : uv;
  outColor = vec4(rgb(p), 1.0);
}
