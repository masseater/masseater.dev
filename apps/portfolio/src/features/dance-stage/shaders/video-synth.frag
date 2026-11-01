// note: 明るさの信号を直接色に置き換えたように、明るさの段ごとに色相を回し、走査線ごとに横の同期をずらして揺らす。
void main() {
  float line = floor(uv.y * 270.0);
  float sync = sin(line * 0.08 + time * 1.5) * 0.02 + (noise(vec2(line * 0.3, time * 4.0)) - 0.5) * 0.01;
  vec2 p = vec2(uv.x + sync, uv.y);
  float l = luma(rgb(p));
  vec3 c = hsv(vec3(fract(l * 2.5 + time * 0.1 + uv.y * 0.3), 0.85, 0.3 + 0.7 * l));
  c *= 0.85 + 0.15 * step(0.5, fract(uv.y * 270.0));
  outColor = vec4(c, 1.0);
}
