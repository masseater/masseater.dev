// note: 8 秒の最後の 2.5 秒で白い画面に切り替え、題字を中央に弾むように出して、音が鳴るのに合わせて輪を 3 つ広げる。それまでは普通に踊りを流す。
// text: SEIKIN DANCE
void main() {
  float t = mod(time, 8.0);
  vec3 c = rgb(uv);
  if (t > 5.5) {
    float k = t - 5.5;
    c = vec3(0.98);
    float scale = 1.0 + 0.3 * exp(-k * 6.0) * cos(k * 20.0);
    for (int i = 0; i < 3; i++) {
      float rk = k - float(i) * 0.15;
      float r = rk * 0.6;
      float ring = smoothstep(0.004, 0.0, abs(dist(uv, vec2(0.5)) - r)) * step(0.0, rk) * exp(-rk * 2.0);
      c = mix(c, vec3(0.9, 0.3, 0.4), ring);
    }
    c = mix(c, vec3(0.9, 0.2, 0.35), textBox((uv - 0.5) / scale + 0.5, vec2(0.5), 0.1, 0));
  }
  outColor = vec4(c, 1.0);
}
