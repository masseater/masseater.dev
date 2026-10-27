// note: 粘土の人形をコマ撮りしたように、1 秒 12 コマに間引き、色を粘土らしく少ない段にまとめて丸みの陰影と指の跡のむらを付ける。輪郭はコマごとに少しずつ揺れる。
void main() {
  float shot = floor(time * 12.0);
  float t = shot / 12.0;
  vec2 wobble = (vec2(noise(uv * 30.0 + shot), noise(uv * 30.0 - shot)) - 0.5) * 0.004;
  vec2 p = uv + wobble;
  float m = pastMatte(p, t);
  vec3 body = pastRgb(p, t);
  body = floor(body * 4.0 + 0.5) / 4.0 * (0.85 + 0.3 * noise(uv * 70.0));
  float rim = m * (1.0 - pastMatte(p + vec2(-0.006, -0.01), t));
  body *= 1.0 + 0.4 * rim;
  vec3 col = mix(plate(uv) * 0.95, body, m);
  outColor = vec4(col, 1.0);
}
