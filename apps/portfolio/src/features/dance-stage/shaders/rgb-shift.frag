// note: 赤・緑・青の版を、骨格から求めた体の動きの大きさに合わせて左右へずらす。
void main() {
  float amount = 0.006 + 0.012 * (0.5 + 0.5 * sin(time * 3.0));
  vec2 dir = vec2(cos(time), sin(time * 1.3)) * amount;
  vec3 c = vec3(rgb(uv + dir).r, rgb(uv).g, rgb(uv - dir).b);
  outColor = vec4(c, 1.0);
}
