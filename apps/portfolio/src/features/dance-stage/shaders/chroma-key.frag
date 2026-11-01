// note: 画面の左側は、緑の幕の前で踊った撮影の素の画で、右側は緑を抜いて浜辺の景色と重ねた画である。境目は左右にゆっくり行き来する。
void main() {
  float m = matte(uv);
  vec3 green = vec3(0.15, 0.75, 0.25);
  vec3 raw = mix(green, rgb(uv) + vec3(-0.03, 0.06, -0.03) * (1.0 - m), m);
  vec3 sky = mix(vec3(0.45, 0.7, 0.95), vec3(0.85, 0.92, 1.0), uv.y / 0.6);
  vec3 sea = mix(vec3(0.1, 0.45, 0.7), vec3(0.25, 0.6, 0.75), (uv.y - 0.6) / 0.15);
  vec3 beach = mix(sky, sea, step(0.6, uv.y));
  beach = mix(beach, vec3(0.92, 0.85, 0.65), step(0.75, uv.y + 0.02 * sin(uv.x * 9.0 + time)));
  vec3 keyed = mix(beach, rgb(uv), m);
  float split = 0.5 + 0.3 * sin(time * 0.5);
  vec3 c = mix(raw, keyed, step(split, uv.x));
  c = mix(c, vec3(1.0), step(abs(uv.x - split), 0.002));
  outColor = vec4(c, 1.0);
}
