// note: 体を平らな色で塗り、太い黒い輪郭線を 1 秒 8 回描き直したように少しずつ揺らす。線がふるえることで手描きらしい味が出る。
void main() {
  float shot = floor(time * 8.0);
  vec2 wob = (vec2(noise(uv * 18.0 + shot * 3.1), noise(uv * 18.0 - shot * 2.3)) - 0.5) * 0.008;
  vec2 p = uv + wob;
  float e = 0.005;
  float edge = abs(matte(p + vec2(e, 0.0)) - matte(p - vec2(e, 0.0))) + abs(matte(p + vec2(0.0, e * 1.7)) - matte(p - vec2(0.0, e * 1.7)));
  vec3 flat_ = floor(rgb(uv) * 3.0 + 0.5) / 3.0;
  vec3 c = mix(vec3(0.98, 0.96, 0.9), flat_, matte(uv));
  c = mix(c, vec3(0.06), clamp(edge * 1.8, 0.0, 1.0));
  outColor = vec4(c, 1.0);
}
