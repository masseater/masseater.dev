// note: 拍のたびに、当たった瞬間の画を 0.12 秒だけ止めてから動きを戻し、止まっている間は画面をわずかに揺らして手応えの重さを出す。
void main() {
  float frozen = step(beat, 0.12);
  float t = mix(time, time - beat, frozen);
  vec2 shake = vec2(sin(time * 90.0), cos(time * 70.0)) * 0.004 * frozen;
  vec3 c = pastRgb(uv + shake, t);
  outColor = vec4(c, 1.0);
}
