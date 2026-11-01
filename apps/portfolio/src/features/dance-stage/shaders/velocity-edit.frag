// note: 1 拍の中で再生の速さを急に変え、拍の頭はゆっくり、拍の終わりに一気に早送りする。速いところでは画面を揺らし、横向きのぶれを足す。
void main() {
  float k = clamp(beat / 0.5, 0.0, 1.0);
  float remap = pow(k, 3.0) * 0.5;
  float t = time - beat + remap * 2.0;
  float speed = 3.0 * k * k;
  vec2 shake = vec2(sin(time * 60.0), cos(time * 53.0)) * 0.004 * speed;
  vec3 c = vec3(0.0);
  for (int i = 0; i < 6; i++) c += pastRgb(uv + shake + vec2(float(i) * 0.004 * speed, 0.0), t);
  c /= 6.0;
  outColor = vec4(c, 1.0);
}
