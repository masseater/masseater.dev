// note: 拍ごとに、0.1 秒の繰り返し、逆再生、顔への急な寄り、色の反転、左右の反転のどれかを選んで詰め込む。反転は 2 拍に 1 回までにして、点滅が速くなりすぎないようにする。
void main() {
  float shot = floor(beatCount);
  float pick = floor(hash(vec2(shot, 3.0)) * 5.0);
  vec2 p = uv;
  float t = time;
  if (pick < 0.5) t = time - beat + mod(beat, 0.1);
  else if (pick < 1.5) t = time - beat * 2.0;
  else if (pick < 2.5) p = (uv - 0.5) / 3.0 + joint(0);
  else if (pick < 3.5) p.x = 1.0 - p.x;
  vec3 c = pastRgb(p, t);
  float invert = step(3.5, pick) * step(mod(shot, 2.0), 0.5);
  c = mix(c, 1.0 - c, invert);
  c = mix(c, c * vec3(1.3, 1.1, 0.7), step(4.5, hash(vec2(shot, 9.0)) * 5.0));
  outColor = vec4(c, 1.0);
}
