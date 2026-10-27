// note: 画面を左から右へ 8 本の帯に分け、帯ごとに違う瞬間の踊りと、朝から夜までの違う時刻の光を当てる。左端が朝、右端が夜になり、1 枚の中で時間が流れる。
void main() {
  float x = uv.x * 8.0;
  float band = floor(x);
  float blend = smoothstep(0.75, 1.0, fract(x));
  vec3 a = pastRgb(uv, time - band * 1.3);
  vec3 b = pastRgb(uv, time - (band + 1.0) * 1.3);
  vec3 c = mix(a, b, blend);
  float hour = uv.x;
  vec3 tint = hour < 0.25 ? mix(vec3(1.0, 0.85, 0.75), vec3(1.0), hour * 4.0) : hour < 0.6 ? vec3(1.0) : hour < 0.8 ? mix(vec3(1.0), vec3(1.15, 0.75, 0.45), (hour - 0.6) * 5.0) : mix(vec3(1.15, 0.75, 0.45), vec3(0.3, 0.35, 0.65), (hour - 0.8) * 5.0);
  c *= tint;
  outColor = vec4(c, 1.0);
}
