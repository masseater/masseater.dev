// note: 暗くした部屋で、両手首に光を持たせて長時間露光したように、手首の通り道を光の線として残し続ける。線はゆっくり消えていく。
// pass: trail persistent
uniform sampler2D trail;
void main() {
  vec3 last = read(trail, uv).rgb * 0.992;
  float l = smoothstep(0.012, 0.004, segment(uv, lastJoint(15), joint(15))) * jointVisible(15);
  float r = smoothstep(0.012, 0.004, segment(uv, lastJoint(16), joint(16))) * jointVisible(16);
  vec3 c = max(last, vec3(0.2, 0.9, 1.0) * l);
  c = max(c, vec3(1.0, 0.3, 0.8) * r);
  outColor = vec4(c, 1.0);
}
// pass:
uniform sampler2D trail;
void main() {
  vec3 room = rgb(uv) * 0.18;
  vec3 light = read(trail, uv).rgb;
  outColor = vec4(room + light * 1.2, 1.0);
}
