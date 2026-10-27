// note: ピントを人物と背景のあいだで行き来させる。人物に合うと背景がぼけ、背景に合うと人物がぼける。
void main() {
  float f = 0.5 + 0.5 * sin(time * 0.8);
  float m = matte(uv);
  vec3 body = mix(rgb(uv), blurRgb(uv, 0.03), f);
  vec3 back = mix(plate(uv), blurPlate(uv, 0.03), 1.0 - f);
  outColor = vec4(mix(back, body, m), 1.0);
}
