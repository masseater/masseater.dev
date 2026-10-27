// note: カメラを止めて入れ替えたように、1.5 秒ごとに人物が一瞬で消え、次の 1.5 秒は部屋の別の場所に現れて踊る。
void main() {
  float slot = floor(time / 1.5);
  float state = mod(slot, 3.0);
  vec3 c = plate(uv);
  if (state > 0.5) {
    float shift = state > 1.5 ? -0.28 : 0.0;
    vec2 p = uv - vec2(shift, 0.0);
    c = mix(c, rgb(p), matte(p) * inside(p));
  }
  outColor = vec4(c, 1.0);
}
